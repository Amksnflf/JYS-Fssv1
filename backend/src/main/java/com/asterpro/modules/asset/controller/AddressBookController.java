package com.asterpro.modules.asset.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.asset.entity.UserAddress;
import com.asterpro.modules.asset.service.AddressBookService;
import com.asterpro.modules.user.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/asset/address")
@RequiredArgsConstructor
public class AddressBookController {

    private final AddressBookService service;
    private final UserService userService;

    @GetMapping("/list")
    public R<List<UserAddress>> list(@RequestParam(required = false) String coin) {
        return R.ok(service.list(userService.currentUserId(), coin));
    }

    @PostMapping("/add")
    public R<UserAddress> add(@Valid @RequestBody AddDTO dto) {
        return R.ok(service.add(userService.currentUserId(),
                dto.getCoin(), dto.getChain(), dto.getAddress(),
                dto.getMemo(), dto.getRemark(), Boolean.TRUE.equals(dto.getWhitelist())));
    }

    @DeleteMapping("/{id}")
    public R<Void> delete(@PathVariable Long id) {
        service.delete(userService.currentUserId(), id);
        return R.ok();
    }

    @Data
    public static class AddDTO {
        @NotBlank(message = "币种不能为空")
        private String coin;
        @NotBlank(message = "网络不能为空")
        private String chain;
        @NotBlank(message = "地址不能为空")
        private String address;
        private String memo;
        private String remark;
        private Boolean whitelist;
    }
}
