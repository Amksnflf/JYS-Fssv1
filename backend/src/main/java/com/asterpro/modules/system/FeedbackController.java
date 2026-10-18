package com.asterpro.modules.system;

import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.support.service.LegacyFeedbackCompatService;
import com.asterpro.modules.system.entity.Feedback;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final LegacyFeedbackCompatService legacyFeedbackCompatService;
    private final UserService userService;

    @PostMapping("/submit")
    public R<Feedback> submit(@RequestBody SubmitDTO dto) {
        if (dto == null || dto.getContent() == null || dto.getContent().isBlank()) {
            throw new BizException("Please enter feedback content"); // 请输入反馈内容
        }
        return R.ok(legacyFeedbackCompatService.submit(
                userService.currentUserId(),
                dto.getCategory(),
                dto.getContent(),
                dto.getImages()
        ));
    }

    @GetMapping("/my")
    public R<Page<Feedback>> my(@RequestParam(defaultValue = "1") int pageNo,
                                @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(legacyFeedbackCompatService.pageMy(userService.currentUserId(), pageNo, pageSize));
    }

    @Data
    public static class SubmitDTO {
        private String category;
        private String content;
        private String images;
    }
}
