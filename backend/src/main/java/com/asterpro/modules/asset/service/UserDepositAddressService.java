package com.asterpro.modules.asset.service;

import com.asterpro.modules.asset.entity.UserDepositAddress;
import com.asterpro.modules.asset.mapper.UserDepositAddressMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDepositAddressService {

    private final UserDepositAddressMapper userDepositAddressMapper;

    public List<UserDepositAddress> listByUserIdAndCoin(Long userId, String coin) {
        LambdaQueryWrapper<UserDepositAddress> w = new LambdaQueryWrapper<>();
        w.eq(UserDepositAddress::getUserId, userId)
         .eq(UserDepositAddress::getCoin, coin)
         .eq(UserDepositAddress::getEnabled, 1);
        return userDepositAddressMapper.selectList(w);
    }
}