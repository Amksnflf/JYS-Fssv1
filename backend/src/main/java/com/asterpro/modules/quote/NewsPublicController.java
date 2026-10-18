package com.asterpro.modules.quote;

import com.asterpro.common.api.R;
import com.asterpro.modules.quote.entity.News;
import com.asterpro.modules.quote.service.NewsService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/news/public")
@RequiredArgsConstructor
public class NewsPublicController {

    private final NewsService service;

    @GetMapping("/page")
    public R<Page<News>> page(
            @RequestParam(defaultValue = "1") int pageNo,
            @RequestParam(defaultValue = "20") int pageSize,
            @RequestParam(required = false) String lang) {
        return R.ok(service.page(pageNo, pageSize, lang));
    }

    @GetMapping("/{id}")
    public R<News> detail(@PathVariable Integer id) {
        return R.ok(service.detail(id));
    }
}
