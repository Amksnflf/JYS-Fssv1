package com.asterpro.modules.support;

import com.asterpro.common.api.R;
import com.asterpro.modules.support.entity.SupportCategory;
import com.asterpro.modules.support.service.SupportConfigService;
import com.asterpro.modules.support.service.SupportTicketService;
import com.asterpro.modules.support.vo.SupportHubConfigVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping({"/support/public", "/public/support"})
@RequiredArgsConstructor
public class SupportPublicController {

    private final SupportConfigService supportConfigService;
    private final SupportTicketService supportTicketService;

    @GetMapping("/config")
    public R<SupportHubConfigVO> config() {
        return R.ok(supportConfigService.buildPublicConfig());
    }

    @GetMapping("/categories")
    public R<List<SupportCategory>> categories() {
        return R.ok(supportTicketService.enabledCategories());
    }
}
