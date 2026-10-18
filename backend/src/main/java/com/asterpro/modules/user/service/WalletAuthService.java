package com.asterpro.modules.user.service;

import cn.dev33.satoken.stp.StpUtil;
import cn.hutool.core.codec.Base58;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.asterpro.common.api.ResultCode;
import com.asterpro.common.exception.BizException;
import com.asterpro.common.util.CodeGen;
import com.asterpro.common.util.RequestUtil;
import com.asterpro.modules.user.dto.LoginVO;
import com.asterpro.modules.user.entity.User;
import com.asterpro.modules.user.entity.UserSecurity;
import com.asterpro.modules.user.entity.UserWallet;
import com.asterpro.modules.user.mapper.UserMapper;
import com.asterpro.modules.user.mapper.UserSecurityMapper;
import com.asterpro.modules.user.mapper.UserWalletMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.crypto.ECDSASignature;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.time.Duration;
import java.util.Arrays;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletAuthService {

    private final UserMapper userMapper;
    private final UserSecurityMapper securityMapper;
    private final UserWalletMapper walletMapper;
    private final StringRedisTemplate redis;

    private static final String NONCE_KEY_PREFIX = "wallet_nonce:";
    private static final Duration NONCE_TTL = Duration.ofMinutes(5);

    private static final String CHAIN_EVM = "ETH";
    private static final String CHAIN_TRON = "TRON";
    private static final String CHAIN_SOL = "SOL";

    private static final byte TRON_ADDRESS_PREFIX = 0x41;
    private static final byte[] TRON_MESSAGE_PREFIX =
            "\u0019TRON Signed Message:\n".getBytes(StandardCharsets.UTF_8);
    private static final byte[] SOLANA_ED25519_SPKI_PREFIX = new byte[]{
            0x30, 0x2A, 0x30, 0x05, 0x06, 0x03, 0x2B, 0x65, 0x70, 0x03, 0x21, 0x00
    };

    public String generateNonce(String address, String chain) {
        if (StrUtil.isBlank(address)) throw new BizException(ResultCode.PARAM_ERROR);
        String normalizedChain = normalizeChain(chain, address);
        String normalizedAddress = normalizeAddress(normalizedChain, address);
        String nonce = "Aster Pro Login " + RandomUtil.randomString(16) + " @" + System.currentTimeMillis();
        redis.opsForValue().set(buildNonceKey(normalizedChain, normalizedAddress), nonce, NONCE_TTL);
        return nonce;
    }

    @Transactional(rollbackFor = Exception.class)
    public LoginVO loginByWallet(String walletType, String chain, String address, String signature) {
        if (StrUtil.hasBlank(address, signature)) throw new BizException(ResultCode.PARAM_ERROR);
        String normalizedChain = normalizeChain(chain, address);
        String normalizedAddress = normalizeAddress(normalizedChain, address);
        String key = buildNonceKey(normalizedChain, normalizedAddress);
        String nonce = redis.opsForValue().get(key);
        if (nonce == null) throw new BizException(400, "Signature expired, please reconnect wallet"); // 签名已过期，请重新连接钱包

        if (!verifySignature(normalizedChain, nonce, normalizedAddress, signature)) {
            throw new BizException(400, "Signature verification failed"); // 签名验证失败
        }
        redis.delete(key);

        UserWallet wallet = walletMapper.selectOne(new LambdaQueryWrapper<UserWallet>()
                .eq(UserWallet::getAddress, normalizedAddress)
                .eq(UserWallet::getChain, normalizedChain)
                .last("LIMIT 1"));

        User user;
        if (wallet == null) {
            user = createUserByWallet(walletType, normalizedChain, normalizedAddress);
        } else {
            user = userMapper.selectById(wallet.getUserId());
            if (user == null) throw new BizException(ResultCode.USER_NOT_EXIST);
            if (user.getStatus() != null && user.getStatus() == 0) {
                throw new BizException(ResultCode.USER_LOCKED);
            }
        }

        StpUtil.login(user.getId());
        UserSecurity sec = securityMapper.selectById(user.getId());
        return buildLoginVO(user, sec);
    }

    private User createUserByWallet(String walletType, String chain, String address) {
        User u = new User();
        u.setUid(generateUid());
        u.setNickname("Wallet-" + address.substring(Math.max(0, address.length() - 6)));
        u.setStatus(1);
        u.setVipLevel(0);
        u.setKycLevel(0);
        u.setInviteCode(generateInviteCode());
        u.setRegisterIp(RequestUtil.ip());
        userMapper.insert(u);

        UserSecurity sec = new UserSecurity();
        sec.setUserId(u.getId());
        sec.setLoginPassword("");
        sec.setGoogleEnabled(0);
        sec.setPhoneBound(0);
        sec.setEmailBound(0);
        sec.setWrongPwdCount(0);
        securityMapper.insert(sec);

        UserWallet w = new UserWallet();
        w.setUserId(u.getId());
        w.setWalletType(StrUtil.blankToDefault(walletType, "unknown"));
        w.setAddress(address);
        w.setChain(chain);
        walletMapper.insert(w);
        return u;
    }

    private LoginVO buildLoginVO(User user, UserSecurity sec) {
        LoginVO vo = new LoginVO();
        vo.setToken(StpUtil.getTokenValue());
        vo.setTokenName(StpUtil.getTokenName());
        vo.setUserId(user.getId());
        vo.setUid(user.getUid());
        vo.setNickname(user.getNickname());
        vo.setAvatar(user.getAvatar());
        vo.setKycLevel(user.getKycLevel());
        vo.setVipLevel(user.getVipLevel());
        vo.setInviteCode(user.getInviteCode());
        vo.setGoogleEnabled(sec != null && sec.getGoogleEnabled() != null && sec.getGoogleEnabled() == 1);
        return vo;
    }

    private boolean verifySignature(String chain, String nonce, String address, String signature) {
        return switch (chain) {
            case CHAIN_TRON -> verifyTronSignature(nonce, address, signature);
            case CHAIN_SOL -> verifySolanaSignature(nonce, address, signature);
            default -> verifyEvmSignature(nonce, address, signature);
        };
    }

    private boolean verifyEvmSignature(String nonce, String address, String signature) {
        try {
            byte[] sig = decodeHexSignature(signature);
            if (sig.length != 65) return false;
            byte v = sig[64];
            if (v < 27) v += 27;
            byte[] r = Arrays.copyOfRange(sig, 0, 32);
            byte[] s = Arrays.copyOfRange(sig, 32, 64);
            Sign.SignatureData data = new Sign.SignatureData(v, r, s);
            BigInteger publicKey = Sign.signedPrefixedMessageToKey(nonce.getBytes(StandardCharsets.UTF_8), data);
            String recovered = "0x" + Keys.getAddress(publicKey);
            return recovered.equalsIgnoreCase(address);
        } catch (Exception e) {
            log.warn("evm wallet signature verify failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean verifyTronSignature(String nonce, String address, String signature) {
        try {
            byte[] sig = decodeHexSignature(signature);
            if (sig.length != 65) return false;

            BigInteger publicKey = recoverPublicKey(tronMessageHash(nonce), sig);
            if (publicKey == null) return false;

            byte[] publicKeyBytes = Numeric.toBytesPadded(publicKey, 64);
            byte[] hashed = Hash.sha3(publicKeyBytes);
            byte[] tronAddress = new byte[21];
            tronAddress[0] = TRON_ADDRESS_PREFIX;
            System.arraycopy(hashed, hashed.length - 20, tronAddress, 1, 20);
            return address.equals(encodeBase58Check(tronAddress));
        } catch (Exception e) {
            log.warn("tron wallet signature verify failed: {}", e.getMessage());
            return false;
        }
    }

    private boolean verifySolanaSignature(String nonce, String address, String signature) {
        try {
            byte[] publicKey = Base58.decode(address);
            byte[] signBytes = decodeHexSignature(signature);
            if (publicKey.length != 32 || signBytes.length != 64) return false;

            byte[] encodedPublicKey = new byte[SOLANA_ED25519_SPKI_PREFIX.length + publicKey.length];
            System.arraycopy(SOLANA_ED25519_SPKI_PREFIX, 0, encodedPublicKey, 0, SOLANA_ED25519_SPKI_PREFIX.length);
            System.arraycopy(publicKey, 0, encodedPublicKey, SOLANA_ED25519_SPKI_PREFIX.length, publicKey.length);

            KeyFactory keyFactory = KeyFactory.getInstance("Ed25519");
            Signature verifier = Signature.getInstance("Ed25519");
            verifier.initVerify(keyFactory.generatePublic(new X509EncodedKeySpec(encodedPublicKey)));
            verifier.update(nonce.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(signBytes);
        } catch (Exception e) {
            log.warn("solana wallet signature verify failed: {}", e.getMessage());
            return false;
        }
    }

    private BigInteger recoverPublicKey(byte[] messageHash, byte[] signature) {
        byte[] r = Arrays.copyOfRange(signature, 0, 32);
        byte[] s = Arrays.copyOfRange(signature, 32, 64);
        int rawV = signature[64] & 0xFF;
        ECDSASignature ecdsaSignature = new ECDSASignature(new BigInteger(1, r), new BigInteger(1, s));

        int[] candidates = rawV >= 27
                ? new int[]{rawV - 27, 0, 1, 2, 3}
                : new int[]{rawV, 0, 1, 2, 3};
        for (int recId : candidates) {
            if (recId < 0 || recId > 3) continue;
            BigInteger publicKey = Sign.recoverFromSignature(recId, ecdsaSignature, messageHash);
            if (publicKey != null) return publicKey;
        }
        return null;
    }

    private byte[] tronMessageHash(String message) {
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        byte[] lengthBytes = String.valueOf(messageBytes.length).getBytes(StandardCharsets.UTF_8);
        return Hash.sha3(concat(TRON_MESSAGE_PREFIX, lengthBytes, messageBytes));
    }

    private byte[] decodeHexSignature(String signature) {
        return Numeric.hexStringToByteArray(signature.startsWith("0x") ? signature : "0x" + signature);
    }

    private String normalizeChain(String chain, String address) {
        String raw = StrUtil.blankToDefault(chain, "").trim().toUpperCase(Locale.ROOT);
        if (raw.isEmpty()) {
            if (isEvmAddress(address)) return CHAIN_EVM;
            throw new BizException(400, "Unsupported wallet chain");
        }
        return switch (raw) {
            case "ETH", "EVM" -> CHAIN_EVM;
            case "TRON", "TRX" -> CHAIN_TRON;
            case "SOL", "SOLANA" -> CHAIN_SOL;
            default -> throw new BizException(400, "Unsupported wallet chain");
        };
    }

    private String normalizeAddress(String chain, String address) {
        String value = StrUtil.trim(address);
        if (StrUtil.isBlank(value)) throw new BizException(ResultCode.PARAM_ERROR);
        return switch (chain) {
            case CHAIN_TRON -> normalizeTronAddress(value);
            case CHAIN_SOL -> normalizeSolanaAddress(value);
            default -> normalizeEvmAddress(value);
        };
    }

    private String normalizeEvmAddress(String address) {
        if (!isEvmAddress(address)) throw new BizException(400, "Invalid wallet address");
        return address.toLowerCase(Locale.ROOT);
    }

    private String normalizeTronAddress(String address) {
        try {
            byte[] decoded = Base58.decodeChecked(address);
            if (decoded.length != 21 || decoded[0] != TRON_ADDRESS_PREFIX) {
                throw new BizException(400, "Invalid wallet address");
            }
            return encodeBase58Check(decoded);
        } catch (Exception e) {
            if (e instanceof BizException bizException) throw bizException;
            throw new BizException(400, "Invalid wallet address");
        }
    }

    private String normalizeSolanaAddress(String address) {
        try {
            byte[] decoded = Base58.decode(address);
            if (decoded.length != 32) throw new BizException(400, "Invalid wallet address");
            return address;
        } catch (Exception e) {
            if (e instanceof BizException bizException) throw bizException;
            throw new BizException(400, "Invalid wallet address");
        }
    }

    private boolean isEvmAddress(String address) {
        return StrUtil.isNotBlank(address) && address.matches("(?i)^0x[0-9a-f]{40}$");
    }

    private String buildNonceKey(String chain, String address) {
        return NONCE_KEY_PREFIX + chain + ":" + address;
    }

    private String encodeBase58Check(byte[] addressBytes) {
        byte[] hash0 = Hash.sha256(addressBytes);
        byte[] hash1 = Hash.sha256(hash0);
        byte[] payload = new byte[addressBytes.length + 4];
        System.arraycopy(addressBytes, 0, payload, 0, addressBytes.length);
        System.arraycopy(hash1, 0, payload, addressBytes.length, 4);
        return Base58.encode(payload);
    }

    private byte[] concat(byte[]... parts) {
        int total = 0;
        for (byte[] part : parts) {
            total += part.length;
        }
        byte[] out = new byte[total];
        int offset = 0;
        for (byte[] part : parts) {
            System.arraycopy(part, 0, out, offset, part.length);
            offset += part.length;
        }
        return out;
    }

    private String generateUid() {
        for (int i = 0; i < 5; i++) {
            String uid = CodeGen.uid();
            if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getUid, uid)) == 0) return uid;
        }
        throw new BizException(ResultCode.SERVER_ERROR);
    }

    private String generateInviteCode() {
        for (int i = 0; i < 5; i++) {
            String code = CodeGen.inviteCode();
            if (userMapper.selectCount(new LambdaQueryWrapper<User>().eq(User::getInviteCode, code)) == 0) return code;
        }
        throw new BizException(ResultCode.SERVER_ERROR);
    }
}
