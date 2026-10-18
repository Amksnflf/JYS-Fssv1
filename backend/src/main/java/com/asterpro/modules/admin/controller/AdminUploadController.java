package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.config.UploadProperties;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/admin/upload")
@RequiredArgsConstructor
public class AdminUploadController {

    private static final Set<String> ALLOWED_BIZ = Set.of("coin", "news");
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private final UploadProperties uploadProperties;
    private final AdminAuthService authService;
    private final AdminLogService logService;

    @PostMapping(value = "/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public R<UploadResult> uploadImage(@RequestParam("file") MultipartFile file,
                                       @RequestParam(defaultValue = "coin") String biz,
                                       HttpServletRequest request) {
        String safeBiz = normalizeBiz(biz);
        validateFile(file);

        String extension = fileExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path targetDir = Path.of(uploadProperties.getRootDir(), safeBiz).toAbsolutePath().normalize();
        Path targetFile = targetDir.resolve(filename).normalize();
        if (!targetFile.startsWith(targetDir)) {
            throw new BizException("invalid upload path");
        }

        try {
            Files.createDirectories(targetDir);
            Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BizException("image upload failed");
        }

        String publicPath = normalizePublicPath(uploadProperties.getPublicPath()) + "/" + safeBiz + "/" + filename;
        String contextPath = request.getContextPath();
        String accessUrl = (contextPath == null || contextPath.isBlank() ? "" : contextPath) + publicPath;

        logService.log(authService.currentAdminId(), "upload", "image_upload",
                "file", filename, safeBiz + ":" + publicPath);

        UploadResult result = new UploadResult();
        result.setBiz(safeBiz);
        result.setFilename(filename);
        result.setPath(publicPath);
        result.setUrl(accessUrl);
        result.setSize(file.getSize());
        result.setContentType(file.getContentType());
        return R.ok(result);
    }

    private String normalizeBiz(String biz) {
        String value = biz == null ? "coin" : biz.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_BIZ.contains(value)) {
            throw new BizException("unsupported upload biz");
        }
        return value;
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BizException("image file is required");
        }
        if (file.getSize() > uploadProperties.getMaxImageSizeBytes()) {
            throw new BizException("image file is too large");
        }
        String extension = fileExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BizException("unsupported image type");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.toLowerCase(Locale.ROOT).startsWith("image/")) {
            throw new BizException("invalid image content type");
        }
    }

    private String fileExtension(String filename) {
        if (filename == null) {
            throw new BizException("invalid image filename");
        }
        int dot = filename.lastIndexOf('.');
        if (dot < 0 || dot == filename.length() - 1) {
            throw new BizException("image extension is required");
        }
        return filename.substring(dot + 1).trim().toLowerCase(Locale.ROOT);
    }

    private String normalizePublicPath(String value) {
        if (value == null || value.isBlank()) return "/uploads";
        String path = value.trim();
        if (!path.startsWith("/")) path = "/" + path;
        while (path.endsWith("/") && path.length() > 1) {
            path = path.substring(0, path.length() - 1);
        }
        return path;
    }

    @Data
    public static class UploadResult {
        private String biz;
        private String filename;
        private String path;
        private String url;
        private long size;
        private String contentType;
    }
}
