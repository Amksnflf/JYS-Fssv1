package com.asterpro.modules.asset.service;

import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.entity.DepositAddress;
import com.asterpro.modules.asset.mapper.CoinMapper;
import com.asterpro.modules.asset.mapper.DepositAddressMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class CoinService {

    private static final Pattern EVM_ADDRESS = Pattern.compile("^0x[a-fA-F0-9]{40}$");
    private static final Pattern TRON_ADDRESS = Pattern.compile("^T[1-9A-HJ-NP-Za-km-z]{33}$");
    private static final Pattern BTC_ADDRESS = Pattern.compile("^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,90}$");

    private final CoinMapper coinMapper;
    private final DepositAddressMapper depositAddressMapper;

    public List<Coin> listAll() {
        LambdaQueryWrapper<Coin> w = new LambdaQueryWrapper<>();
        w.orderByAsc(Coin::getSort);
        return coinMapper.selectList(w);
    }

    public Coin mustGet(String code) {
        Coin c = findByCode(code);
        if (c == null) throw new BizException(ResultCode.PARAM_ERROR.getCode(), "Coin not found"); // 币种不存在
        return c;
    }

    public Coin findByCode(String code) {
        LambdaQueryWrapper<Coin> w = new LambdaQueryWrapper<>();
        w.eq(Coin::getCode, code).last("LIMIT 1");
        return coinMapper.selectOne(w);
    }

    public List<DepositAddress> listDepositAddress(String coin) {
        LambdaQueryWrapper<DepositAddress> w = new LambdaQueryWrapper<>();
        w.eq(DepositAddress::getCoin, coin).eq(DepositAddress::getEnabled, 1);
        return depositAddressMapper.selectList(w);
    }

    public boolean isSupportedChain(String coin, String chain) {
        Coin c = mustGet(coin);
        String normalizedChain = normalizeChain(chain, c);
        return listDepositAddress(coin).stream().anyMatch(a -> normalizedChain.equalsIgnoreCase(a.getChain()))
                || normalizedChain.equalsIgnoreCase(c.getChain());
    }

    public boolean isPlatformDepositAddress(String coin, String chain, String address) {
        if (address == null || address.isBlank()) return false;
        Coin c = mustGet(coin);
        String normalizedChain = normalizeChain(chain, c);
        return listDepositAddress(coin).stream().anyMatch(a ->
                normalizedChain.equalsIgnoreCase(a.getChain())
                        && address.trim().equalsIgnoreCase(a.getAddress()));
    }

    public boolean looksLikeChainAddress(String chain, String address) {
        if (chain == null || address == null || address.isBlank()) return false;
        String value = address.trim();
        String c = chain.toUpperCase(Locale.ROOT);
        if (c.contains("TRC") || "TRON".equals(c)) return TRON_ADDRESS.matcher(value).matches();
        if (c.contains("ERC") || c.contains("BEP") || "ETH".equals(c) || "EVM".equals(c)) {
            return EVM_ADDRESS.matcher(value).matches();
        }
        if ("BTC".equals(c)) return BTC_ADDRESS.matcher(value).matches();
        if ("SOL".equals(c)) return value.length() >= 32 && value.length() <= 44;
        if ("DOGE".equals(c)) return value.length() >= 26 && value.length() <= 45;
        return value.length() >= 16 && value.length() <= 128;
    }

    private String normalizeChain(String chain, Coin coin) {
        return (chain == null || chain.isBlank()) ? coin.getChain() : chain.trim();
    }
}
