package com.asterpro.modules.system;

import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.system.entity.Dynamic;
import com.asterpro.modules.system.entity.DynamicLike;
import com.asterpro.modules.system.mapper.DynamicLikeMapper;
import com.asterpro.modules.system.mapper.DynamicMapper;
import com.asterpro.modules.user.service.UserService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dynamic")
@RequiredArgsConstructor
public class DynamicController {

    private final DynamicMapper dynamicMapper;
    private final DynamicLikeMapper dynamicLikeMapper;
    private final UserService userService;

    @GetMapping("/public/page")
    public R<Page<Dynamic>> page(@RequestParam(defaultValue = "1") int pageNo,
                                 @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<Dynamic> w = new LambdaQueryWrapper<>();
        w.and(x -> x.eq(Dynamic::getStatus, 1).or().isNull(Dynamic::getStatus));
        w.orderByDesc(Dynamic::getPinned).orderByDesc(Dynamic::getId);
        return R.ok(dynamicMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/submit")
    public R<Dynamic> submit(@RequestBody SubmitDTO dto) {
        if (dto.getContent() == null || dto.getContent().isBlank()) throw new BizException("Please enter dynamic content"); // 请输入动态内容
        Dynamic d = new Dynamic();
        d.setUserId(userService.currentUserId());
        d.setContent(dto.getContent());
        d.setImages(dto.getImages());
        d.setLikeCount(0);
        d.setCommentCount(0);
        d.setStatus(1);
        d.setPinned(0);
        dynamicMapper.insert(d);
        return R.ok(d);
    }

    @PostMapping("/like/{id}")
    public R<Dynamic> like(@PathVariable Long id) {
        Dynamic d = dynamicMapper.selectById(id);
        if (d == null) throw new BizException("Dynamic not found"); // 动态不存在
        DynamicLike like = new DynamicLike();
        like.setUserId(userService.currentUserId());
        like.setDynamicId(id);
        try {
            dynamicLikeMapper.insert(like);
        } catch (DuplicateKeyException e) {
            return R.ok(d);
        }
        dynamicMapper.update(null, new LambdaUpdateWrapper<Dynamic>()
                .eq(Dynamic::getId, id)
                .setSql("like_count = IFNULL(like_count, 0) + 1"));
        return R.ok(dynamicMapper.selectById(id));
    }

    @Data
    public static class SubmitDTO {
        private String content;
        private String images;
    }
}
