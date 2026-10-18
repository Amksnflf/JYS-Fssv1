package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.entity.Announcement;
import com.asterpro.modules.admin.service.AnnouncementPublicService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/announcement/public")
@RequiredArgsConstructor
public class AnnouncementPublicController {

    private final AnnouncementPublicService service;

    @GetMapping("/page")
    public R<Page<Announcement>> page(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String lang) {
        return R.ok(service.page(pageNo, pageSize, lang));
    }

    @GetMapping("/{id}")
    public R<Announcement> detail(@PathVariable Integer id) {
        return R.ok(service.detail(id));
    }
}
