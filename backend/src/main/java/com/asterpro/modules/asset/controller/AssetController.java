package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.dto.AssetOverviewVO;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.entity.DepositAddress;
import com.asterpro.modules.asset.entity.UserDepositAddress;
import com.asterpro.modules.asset.service.AssetService;
import com.asterpro.modules.asset.service.CoinService;
import com.asterpro.modules.asset.service.UserDepositAddressService;
import com.asterpro.modules.user.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/asset")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;
    private final CoinService coinService;
    private final UserService userService;
    private final UserDepositAddressService userDepositAddressService;

    @GetMapping("/overview")
    public R<AssetOverviewVO> overview() {
        return R.ok(assetService.overview(userService.currentUserId()));
    }

    @GetMapping("/coin/list")
    public R<List<Coin>> coinList() {
        return R.ok(coinService.listAll());
    }

    @GetMapping("/coin/deposit-address")
    public R<List<DepositAddress>> depositAddress(@RequestParam String coin) {
        Long userId = userService.currentUserId();
        List<UserDepositAddress> userAddresses = userDepositAddressService.listByUserIdAndCoin(userId, coin);
        if (!userAddresses.isEmpty()) {
            List<DepositAddress> result = new ArrayList<>();
            for (UserDepositAddress ua : userAddresses) {
                DepositAddress da = new DepositAddress();
                da.setId(ua.getId());
                da.setCoin(ua.getCoin());
                da.setChain(ua.getChain());
                da.setAddress(ua.getAddress());
                da.setMemo(ua.getMemo());
                da.setEnabled(ua.getEnabled());
                da.setCreatedAt(ua.getCreatedAt());
                result.add(da);
            }
            return R.ok(result);
        }
        return R.ok(coinService.listDepositAddress(coin));
    }
}
