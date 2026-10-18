package com.asterpro.modules.asset.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.entity.UserAddress;
import com.asterpro.modules.asset.mapper.UserAddressMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AddressBookService {

    private final UserAddressMapper mapper;
    private final CoinService coinService;

    public List<UserAddress> list(Long userId, String coin) {
        LambdaQueryWrapper<UserAddress> w = new LambdaQueryWrapper<>();
        w.eq(UserAddress::getUserId, userId);
        if (StrUtil.isNotBlank(coin)) w.eq(UserAddress::getCoin, coin);
        w.orderByDesc(UserAddress::getCreatedAt);
        return mapper.selectList(w);
    }

    public UserAddress add(Long userId, String coin, String chain,
                           String address, String memo, String remark, boolean whitelist) {
        if (StrUtil.hasBlank(coin, chain, address)) throw new BizException("Missing parameters"); // 参数缺失
        if (!coinService.isSupportedChain(coin, chain)) throw new BizException("Network not supported"); // 网络不支持
//        if (!coinService.looksLikeChainAddress(chain, address)) throw new BizException("Invalid address format"); // 地址格式错误
        UserAddress a = new UserAddress();
        a.setUserId(userId);
        a.setCoin(coin);
        a.setChain(chain);
        a.setAddress(address);
        a.setMemo(memo);
        a.setRemark(remark);
        a.setWhitelist(whitelist ? 1 : 0);
        mapper.insert(a);
        return a;
    }

    public void delete(Long userId, Long id) {
        UserAddress a = mapper.selectById(id);
        if (a == null) return;
        if (!a.getUserId().equals(userId)) throw new BizException("No permission to operate"); // 无权操作
        mapper.deleteById(id);
    }
}
