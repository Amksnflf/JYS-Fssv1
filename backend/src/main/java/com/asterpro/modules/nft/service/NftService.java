package com.asterpro.modules.nft.service;

import cn.hutool.core.util.IdUtil;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.entity.Account;
import com.asterpro.modules.asset.service.AccountService;
import com.asterpro.modules.nft.entity.NftCollection;
import com.asterpro.modules.nft.entity.NftItem;
import com.asterpro.modules.nft.entity.NftOrder;
import com.asterpro.modules.nft.mapper.NftCollectionMapper;
import com.asterpro.modules.nft.mapper.NftItemMapper;
import com.asterpro.modules.nft.mapper.NftOrderMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class NftService {

    private final NftCollectionMapper collectionMapper;
    private final NftItemMapper itemMapper;
    private final NftOrderMapper orderMapper;
    private final AccountService accountService;

    public List<NftCollection> collections() {
        LambdaQueryWrapper<NftCollection> w = new LambdaQueryWrapper<>();
        w.orderByDesc(NftCollection::getIsHot).orderByAsc(NftCollection::getSort);
        return collectionMapper.selectList(w);
    }

    public Page<NftItem> items(Integer collectionId, Integer status, int pageNo, int pageSize) {
        LambdaQueryWrapper<NftItem> w = new LambdaQueryWrapper<>();
        if (collectionId != null) w.eq(NftItem::getCollectionId, collectionId);
        if (status != null) w.eq(NftItem::getStatus, status);
        w.orderByAsc(NftItem::getPrice);
        return itemMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w);
    }

    public NftCollection collectionDetail(Integer id) {
        NftCollection collection = collectionMapper.selectById(id);
        if (collection == null) throw new BizException("NFT collection not found"); // NFT 合集不存在
        return collection;
    }

    public NftItem itemDetail(Long id) {
        NftItem item = itemMapper.selectById(id);
        if (item == null) throw new BizException("NFT not found"); // NFT 不存在
        return item;
    }

    private volatile Map<String, Object> cachedStats;
    private volatile long cachedStatsAt = 0L;

    public Map<String, Object> stats() {
        long now = System.currentTimeMillis();
        Map<String, Object> local = cachedStats;
        if (local != null && (now - cachedStatsAt) < 30_000L) {
            return local;
        }
        List<NftOrder> orders = orderMapper.selectList(new LambdaQueryWrapper<NftOrder>()
                .select(NftOrder::getPrice, NftOrder::getBuyerId));
        Long itemCount = itemMapper.selectCount(new LambdaQueryWrapper<NftItem>());
        Map<String, Object> result = new HashMap<>();
        result.put("nftTradingNumber", orders.size());
        result.put("nftTradingVolume", orders.stream()
                .map(NftOrder::getPrice)
                .filter(java.util.Objects::nonNull)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add));
        result.put("nftNFTNumber", itemCount == null ? 0 : itemCount);
        result.put("nftNumOfBeneficiaries", orders.stream()
                .map(NftOrder::getBuyerId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .count());
        NftCollection withVideo = collectionMapper.selectOne(new LambdaQueryWrapper<NftCollection>()
                .select(NftCollection::getVideoUrl)
                .isNotNull(NftCollection::getVideoUrl)
                .last("limit 1"));
        result.put("nftVideoLiveUrl1", withVideo == null ? "" : withVideo.getVideoUrl());
        cachedStats = result;
        cachedStatsAt = now;
        return result;
    }

    public List<Map<String, Object>> incomes(int limit) {
        return orderMapper.selectList(new LambdaQueryWrapper<NftOrder>()
                        .orderByDesc(NftOrder::getId)
                        .last("limit " + Math.max(1, Math.min(limit, 50))))
                .stream()
                .map(order -> {
                    Map<String, Object> row = new HashMap<>();
                    row.put("address", maskAddress("0x" + Long.toHexString(order.getBuyerId() == null ? 0 : order.getBuyerId()) + Long.toHexString(order.getId())));
                    row.put("tokenNo", "#" + order.getItemId());
                    row.put("income", order.getPrice());
                    return row;
                })
                .toList();
    }

    private String maskAddress(String address) {
        if (address.length() <= 12) return address;
        return address.substring(0, 9) + "...." + address.substring(address.length() - 7);
    }

    public Page<NftItem> myItems(Long userId, int pageNo, int pageSize) {
        LambdaQueryWrapper<NftItem> w = new LambdaQueryWrapper<>();
        w.eq(NftItem::getOwnerId, userId).orderByDesc(NftItem::getUpdatedAt);
        return itemMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w);
    }

    @Transactional
    public NftOrder buy(Long userId, Long itemId) {
        NftItem item = itemMapper.selectById(itemId);
        if (item == null || item.getStatus() == null || item.getStatus() != NftItem.STATUS_ON_SALE) {
            throw new BizException("NFT is not available for purchase"); // NFT 不可购买
        }
        if (item.getOwnerId() != null && item.getOwnerId().equals(userId)) {
            throw new BizException("Cannot purchase your own NFT"); // 不能购买自己的 NFT
        }
        Long sellerId = item.getOwnerId();
        int rows = itemMapper.update(null, new LambdaUpdateWrapper<NftItem>()
                .eq(NftItem::getId, itemId)
                .eq(NftItem::getStatus, NftItem.STATUS_ON_SALE)
                .set(NftItem::getStatus, NftItem.STATUS_SOLD)
                .set(NftItem::getOwnerId, userId));
        if (rows == 0) {
            throw new BizException("NFT has been sold out"); // NFT 已被抢购
        }

        accountService.decrease(userId, Account.SPOT, item.getCoin(), item.getPrice(),
                "nft", "BUY-" + item.getId(), "NFT 购买:" + item.getName());
        if (sellerId != null) {
            accountService.increase(sellerId, Account.SPOT, item.getCoin(), item.getPrice(),
                    "nft", "SELL-" + item.getId(), "NFT 出售:" + item.getName());
        }

        NftOrder order = new NftOrder();
        order.setOrderNo("N" + IdUtil.getSnowflakeNextIdStr());
        order.setItemId(item.getId());
        order.setBuyerId(userId);
        order.setSellerId(sellerId);
        order.setPrice(item.getPrice());
        order.setCoin(item.getCoin());
        order.setStatus(1);
        orderMapper.insert(order);
        return order;
    }
}
