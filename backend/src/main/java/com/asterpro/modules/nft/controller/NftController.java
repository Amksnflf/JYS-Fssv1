package com.asterpro.modules.nft.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.nft.entity.NftCollection;
import com.asterpro.modules.nft.entity.NftItem;
import com.asterpro.modules.nft.entity.NftOrder;
import com.asterpro.modules.nft.service.NftService;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/nft")
@RequiredArgsConstructor
public class NftController {

    private final NftService service;
    private final UserService userService;

    @GetMapping("/public/collections")
    public R<List<NftCollection>> collections() {
        return R.ok(service.collections());
    }

    @GetMapping("/public/items")
    public R<Page<NftItem>> items(@RequestParam(required = false) Integer collectionId,
                                  @RequestParam(required = false, defaultValue = "1") Integer status,
                                  @RequestParam(defaultValue = "1") int pageNo,
                                  @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(service.items(collectionId, status, pageNo, pageSize));
    }

    @GetMapping("/public/stats")
    public R<Map<String, Object>> stats() {
        return R.ok(service.stats());
    }

    @GetMapping("/public/incomes")
    public R<List<Map<String, Object>>> incomes(@RequestParam(defaultValue = "10") int limit) {
        return R.ok(service.incomes(limit));
    }

    @GetMapping("/public/collection/{id}")
    public R<NftCollection> collectionDetail(@PathVariable Integer id) {
        return R.ok(service.collectionDetail(id));
    }

    @GetMapping("/public/item/{id}")
    public R<NftItem> itemDetail(@PathVariable Long id) {
        return R.ok(service.itemDetail(id));
    }

    @PostMapping("/buy/{itemId}")
    public R<NftOrder> buy(@PathVariable Long itemId) {
        return R.ok(service.buy(userService.currentUserId(), itemId));
    }

    @GetMapping("/my")
    public R<Page<NftItem>> my(@RequestParam(defaultValue = "1") int pageNo,
                               @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(service.myItems(userService.currentUserId(), pageNo, pageSize));
    }
}
