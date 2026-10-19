package com.asterpro.modules.user.service;

import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.modules.user.dto.KycSubmitDTO;
import com.asterpro.modules.user.entity.UserKyc;
import com.asterpro.modules.user.mapper.UserKycMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class KycService {

    private final UserKycMapper kycMapper;

    public void submit(Long userId, KycSubmitDTO dto) {
        if (dto.getLevel() == 2) {
            if (StrUtil.hasBlank(dto.getIdFrontUrl(), dto.getIdBackUrl(), dto.getFaceUrl())) {
                throw new BizException(400, "Advanced verification requires ID card photos and face photo"); // 高级认证需上传证件照与人脸照
            }
        }
        UserKyc exist = kycMapper.selectOne(new LambdaQueryWrapper<UserKyc>()
                .eq(UserKyc::getUserId, userId)
                .eq(UserKyc::getLevel, dto.getLevel())
                .orderByDesc(UserKyc::getId)
                .last("LIMIT 1"));
        if (exist != null && exist.getAuditStatus() != null && exist.getAuditStatus() == 0) {
            throw new BizException(400, "You have already submitted verification, it is under review"); // 您已提交认证，正在审核中
        }
        if (exist != null && exist.getAuditStatus() != null && exist.getAuditStatus() == 1) {
            throw new BizException(400, "You have already passed this level of verification"); // 您已通过该级别认证
        }
        UserKyc r = new UserKyc();
        r.setUserId(userId);
        r.setLevel(dto.getLevel());
        r.setCountry(dto.getCountry());
        r.setRealName(dto.getRealName());
        r.setIdType(dto.getIdType());
        r.setIdNo(dto.getIdNo());
        r.setIdFrontUrl(dto.getIdFrontUrl());
        r.setIdBackUrl(dto.getIdBackUrl());
        r.setFaceUrl(dto.getFaceUrl());
        r.setAuditStatus(0);
        kycMapper.insert(r);
    }

    public List<UserKyc> myKyc(Long userId) {
        List<UserKyc> list = kycMapper.selectList(new LambdaQueryWrapper<UserKyc>()
                .eq(UserKyc::getUserId, userId)
                .orderByDesc(UserKyc::getId));
        for (UserKyc item : list) {
            if (item != null && StrUtil.isNotBlank(item.getIdNo())) {
                item.setIdNo(maskIdNo(item.getIdNo()));
            }
        }
        return list;
    }

    private String maskIdNo(String idNo) {
        if (idNo == null || idNo.isBlank()) return idNo;
        String s = idNo.trim();
        if (s.length() <= 6) {
            return s.charAt(0) + "****" + s.charAt(s.length() - 1);
        }
        return s.substring(0, 3) + "***********" + s.substring(s.length() - 3);
    }
}
