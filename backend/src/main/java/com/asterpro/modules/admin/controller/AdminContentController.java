package com.asterpro.modules.admin.controller;

import com.asterpro.common.api.R;
import com.asterpro.modules.admin.entity.Announcement;
import com.asterpro.modules.admin.entity.Banner;
import com.asterpro.modules.admin.mapper.AnnouncementMapper;
import com.asterpro.modules.admin.mapper.BannerMapper;
import com.asterpro.modules.admin.service.AdminAuthService;
import com.asterpro.modules.admin.service.AdminLogService;
import com.asterpro.modules.asset.entity.Coin;
import com.asterpro.modules.asset.mapper.CoinMapper;
import com.asterpro.modules.finance.entity.AiStrategy;
import com.asterpro.modules.finance.entity.LockProduct;
import com.asterpro.modules.finance.entity.LoanProduct;
import com.asterpro.modules.finance.entity.PortfolioProduct;
import com.asterpro.modules.finance.mapper.AiStrategyMapper;
import com.asterpro.modules.finance.mapper.LockProductMapper;
import com.asterpro.modules.finance.mapper.LoanProductMapper;
import com.asterpro.modules.finance.mapper.PortfolioProductMapper;
import com.asterpro.modules.nft.entity.NftCollection;
import com.asterpro.modules.nft.entity.NftItem;
import com.asterpro.modules.nft.mapper.NftCollectionMapper;
import com.asterpro.modules.nft.mapper.NftItemMapper;
import com.asterpro.modules.quote.entity.News;
import com.asterpro.modules.quote.entity.Symbol;
import com.asterpro.modules.quote.mapper.NewsMapper;
import com.asterpro.modules.quote.mapper.SymbolMapper;
import com.asterpro.modules.quote.dto.KlineBar;
import com.asterpro.modules.quote.dto.QuoteStats24hVO;
import com.asterpro.modules.quote.dto.QuoteTick;
import com.asterpro.modules.quote.service.NewsService;
import com.asterpro.modules.quote.service.NewsSyncService;
import com.asterpro.modules.support.service.LegacyFeedbackCompatService;
import com.asterpro.modules.quote.service.QuoteRouterService;
import com.asterpro.modules.quote.service.SymbolService;
import com.asterpro.modules.system.entity.Feedback;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.Data;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/admin/content")
@RequiredArgsConstructor
public class AdminContentController {

    private final SymbolMapper symbolMapper;
    private final CoinMapper coinMapper;
    private final NewsMapper newsMapper;
    private final AnnouncementMapper announcementMapper;
    private final BannerMapper bannerMapper;
    private final LockProductMapper lockProductMapper;
    private final PortfolioProductMapper portfolioProductMapper;
    private final LoanProductMapper loanProductMapper;
    private final AiStrategyMapper aiStrategyMapper;
    private final NftCollectionMapper nftCollectionMapper;
    private final NftItemMapper nftItemMapper;
    private final LegacyFeedbackCompatService legacyFeedbackCompatService;
    private final AdminAuthService authService;
    private final AdminLogService logService;
    private final QuoteRouterService quoteRouterService;
    private final NewsService newsService;
    private final NewsSyncService newsSyncService;

    // ========== 交易对 ==========

    @GetMapping("/symbol/list")
    public R<List<Symbol>> symbolList(@RequestParam(required = false) String tradeType) {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        if (tradeType != null && !tradeType.isBlank()) w.eq(Symbol::getTradeType, tradeType);
        w.orderByAsc(Symbol::getSort);
        return R.ok(symbolMapper.selectList(w));
    }

    @GetMapping("/symbol/product/list")
    public R<List<SymbolProductDTO>> symbolProductList(@RequestParam(required = false) String category) {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        if (category != null && !category.isBlank()) w.eq(Symbol::getCategory, category);
        w.orderByAsc(Symbol::getSort).orderByAsc(Symbol::getSymbol).orderByAsc(Symbol::getTradeType);

        List<Symbol> allSymbols = symbolMapper.selectList(w);
        Map<String, SymbolProductDTO> grouped = new LinkedHashMap<>();
        for (Symbol s : allSymbols) {
            SymbolProductDTO dto = grouped.computeIfAbsent(s.getSymbol(), key -> {
                SymbolProductDTO init = fromSymbol(s);
                init.setEnabled(0);
                return init;
            });
            if (Integer.valueOf(1).equals(s.getEnabled())) {
                dto.setEnabled(1);
                switch (s.getTradeType()) {
                    case "spot" -> dto.setSupportSpot(true);
                    case "perp" -> dto.setSupportPerp(true);
                    case "option" -> dto.setSupportOption(true);
                    default -> { }
                }
            }
        }
        for (Symbol s : allSymbols) {
            SymbolProductDTO dto = grouped.get(s.getSymbol());
            if (dto != null && (dto.getEnabled() == null || dto.getEnabled() == 0)) {
                switch (s.getTradeType()) {
                    case "spot" -> dto.setSupportSpot(true);
                    case "perp" -> dto.setSupportPerp(true);
                    case "option" -> dto.setSupportOption(true);
                    default -> { }
                }
            }
        }
        return R.ok(new ArrayList<>(grouped.values()));
    }

    @GetMapping("/symbol/quote/check")
    public R<List<SymbolQuoteCheckDTO>> symbolQuoteCheck(
            @RequestParam(defaultValue = "spot") String tradeType,
            @RequestParam(required = false) String category) {
        LambdaQueryWrapper<Symbol> w = new LambdaQueryWrapper<>();
        w.eq(Symbol::getEnabled, 1);
        if (tradeType != null && !tradeType.isBlank()) w.eq(Symbol::getTradeType, tradeType);
        if (category != null && !category.isBlank()) w.eq(Symbol::getCategory, category);
        w.orderByAsc(Symbol::getCategory).orderByAsc(Symbol::getSort).orderByAsc(Symbol::getSymbol);

        List<SymbolQuoteCheckDTO> result = new ArrayList<>();
        for (Symbol symbol : symbolMapper.selectList(w)) {
            if (symbol == null) continue;
            SymbolQuoteCheckDTO row = new SymbolQuoteCheckDTO();
            row.setId(symbol.getId());
            row.setSymbol(symbol.getSymbol());
            row.setTradeType(symbol.getTradeType());
            row.setCategory(symbol.getCategory());
            row.setBaseCoin(symbol.getBaseCoin());
            row.setQuoteCoin(symbol.getQuoteCoin());
            row.setEnabled(symbol.getEnabled());
            row.setSubscribeEnabled(symbol.getSubscribeEnabled());
            row.setPrimarySource(symbol.getPrimarySource());
            row.setPrimarySymbol(symbol.getPrimarySymbol());
            row.setWsSource(symbol.getWsSource());
            row.setWsSymbol(symbol.getWsSymbol());
            row.setKlineSource(symbol.getKlineSource());
            row.setKlineSymbol(symbol.getKlineSymbol());
            row.setRouteInfo(quoteRouterService.explainRoute(symbol, symbol.getSymbol()));

            QuoteTick publicTick = quoteRouterService.getPublicQuoteTick(symbol);
            QuoteStats24hVO publicStats = quoteRouterService.getPublicStats24h(symbol.getSymbol());
            List<KlineBar> kline = quoteRouterService.getKline(symbol.getSymbol(), "1min", 1);

            row.setTickOk(publicTick != null && publicTick.getPrice() != null);
            row.setStatsOk(publicStats != null && (publicStats.getClose() != null || publicStats.getHigh() != null || publicStats.getLow() != null));
            row.setKlineOk(kline != null && !kline.isEmpty());
            row.setPrice(publicTick != null && publicTick.getPrice() != null ? publicTick.getPrice().toPlainString() : null);
            row.setChange(publicTick != null && publicTick.getChange() != null ? publicTick.getChange().toPlainString() : null);
            row.setStatsClose(publicStats != null && publicStats.getClose() != null ? publicStats.getClose().toPlainString() : null);
            row.setKlineCount(kline == null ? 0 : kline.size());
            row.setSuspectReason(buildQuoteCheckReason(row));
            result.add(row);
        }
        return R.ok(result);
    }

    @PostMapping("/symbol/save")
    public R<Symbol> symbolSave(@RequestBody Symbol dto) {
        normalizeSymbolModel(dto);
        if (dto.getId() != null) symbolMapper.updateById(dto);
        else symbolMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "symbol_save",
                "symbol", String.valueOf(dto.getId()), dto.getSymbol() + "/" + dto.getTradeType());
        return R.ok(dto);
    }

    @PostMapping("/symbol/product/save")
    public R<SymbolProductDTO> symbolProductSave(@RequestBody SymbolProductDTO dto) {
        normalizeSymbolProduct(dto);
        saveSupportedType(dto, "spot", dto.isSupportSpot());
        saveSupportedType(dto, "perp", dto.isSupportPerp());
        saveSupportedType(dto, "option", dto.isSupportOption());
        logService.log(authService.currentAdminId(), "content", "symbol_product_save",
                "symbol", dto.getSymbol(), dto.getCategory());
        return R.ok(dto);
    }

    private int normalizeChangePrecision(Integer precision) {
        if (precision == null) return 2;
        return Math.max(0, Math.min(6, precision));
    }

    private String buildQuoteCheckReason(SymbolQuoteCheckDTO row) {
        List<String> reasons = new ArrayList<>();
        if (!row.isTickOk()) reasons.add("No tick data"); // tick无数据
        if (!row.isStatsOk()) reasons.add("No 24h data"); // 24h无数据
        if (!row.isKlineOk()) reasons.add("No K-line data"); // K线无数据
        if (!Integer.valueOf(1).equals(row.getSubscribeEnabled())) reasons.add("Not in subscription pool"); // 未进订阅池
        if (blankToNull(row.getPrimarySource()) == null) reasons.add("Primary source missing"); // 主源缺失
        if (blankToNull(row.getWsSource()) == null) reasons.add("Public tick source missing"); // 公开tick源缺失
        if (blankToNull(row.getKlineSource()) == null) reasons.add("K-line source missing"); // K线源缺失
        return reasons.isEmpty() ? "Normal" : String.join(" / ", reasons); // 正常
    }

    @PostMapping("/symbol/{id}/delete")
    public R<Void> symbolDelete(@PathVariable Long id) {
        symbolMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "symbol_delete",
                "symbol", String.valueOf(id), null);
        return R.ok();
    }

    @PostMapping("/symbol/product/{symbol}/delete")
    public R<Void> symbolProductDelete(@PathVariable String symbol) {
        symbolMapper.delete(new LambdaQueryWrapper<Symbol>().eq(Symbol::getSymbol, SymbolService.normalizeSymbol(symbol)));
        logService.log(authService.currentAdminId(), "content", "symbol_product_delete",
                "symbol", symbol, null);
        return R.ok();
    }

    private SymbolProductDTO fromSymbol(Symbol s) {
        SymbolProductDTO dto = new SymbolProductDTO();
        dto.setSymbol(s.getSymbol());
        dto.setBaseCoin(s.getBaseCoin());
        dto.setQuoteCoin(s.getQuoteCoin());
        dto.setCategory(s.getCategory());
        dto.setAlltickCode(s.getAlltickCode());
        dto.setPrimarySource(s.getPrimarySource());
        dto.setPrimarySymbol(s.getPrimarySymbol());
        dto.setBackupSource(s.getBackupSource());
        dto.setBackupSymbol(s.getBackupSymbol());
        dto.setKlineSource(s.getKlineSource());
        dto.setKlineSymbol(s.getKlineSymbol());
        dto.setDepthSource(s.getDepthSource());
        dto.setDepthSymbol(s.getDepthSymbol());
        dto.setTradeSource(s.getTradeSource());
        dto.setTradeSymbol(s.getTradeSymbol());
        dto.setWsSource(s.getWsSource());
        dto.setWsSymbol(s.getWsSymbol());
        dto.setStatsMode(s.getStatsMode());
        dto.setDepthMode(s.getDepthMode());
        dto.setTradeMode(s.getTradeMode());
        dto.setSubscribeEnabled(s.getSubscribeEnabled());
        dto.setPricePrecision(s.getPricePrecision());
        dto.setAmountPrecision(s.getAmountPrecision());
        dto.setChangePrecision(normalizeChangePrecision(s.getChangePrecision()));
        dto.setMinAmount(s.getMinAmount());
        dto.setMaxLeverage(s.getMaxLeverage());
        dto.setTakerFee(s.getTakerFee());
        dto.setMakerFee(s.getMakerFee());
        dto.setEnabled(s.getEnabled());
        dto.setIsHot(s.getIsHot());
        dto.setSort(s.getSort());
        return dto;
    }

    private void normalizeSymbolProduct(SymbolProductDTO dto) {
        dto.setSymbol(SymbolService.normalizeSymbol(required(dto.getSymbol(), "symbol")));
        dto.setBaseCoin(required(dto.getBaseCoin(), "baseCoin").toUpperCase());
        dto.setQuoteCoin(required(dto.getQuoteCoin(), "quoteCoin").toUpperCase());
        dto.setCategory(normalizeCategory(dto.getCategory()));
        dto.setAlltickCode(defaultValue(dto.getAlltickCode(), dto.getSymbol().replace("-", "")));
        dto.setPricePrecision(defaultInt(dto.getPricePrecision(), 2));
        dto.setAmountPrecision(defaultInt(dto.getAmountPrecision(), 4));
        dto.setChangePrecision(normalizeChangePrecision(dto.getChangePrecision()));
        dto.setMinAmount(defaultDecimal(dto.getMinAmount(), "1"));
        dto.setMaxLeverage(defaultInt(dto.getMaxLeverage(), 1));
        dto.setTakerFee(defaultDecimal(dto.getTakerFee(), "0.001"));
        dto.setMakerFee(defaultDecimal(dto.getMakerFee(), "0.001"));
        dto.setEnabled(defaultInt(dto.getEnabled(), 1));
        dto.setIsHot(defaultInt(dto.getIsHot(), 0));
        dto.setSort(defaultInt(dto.getSort(), 0));
    }

    private void saveSupportedType(SymbolProductDTO dto, String tradeType, boolean supported) {
        Symbol existing = symbolMapper.selectOne(new LambdaQueryWrapper<Symbol>()
                .eq(Symbol::getSymbol, dto.getSymbol())
                .eq(Symbol::getTradeType, tradeType)
                .last("LIMIT 1"));
        if (!supported) {
            if (existing != null && Integer.valueOf(1).equals(existing.getEnabled())) {
                existing.setEnabled(0);
                symbolMapper.updateById(existing);
            }
            return;
        }

        Symbol s = existing == null ? new Symbol() : existing;
        s.setSymbol(dto.getSymbol());
        s.setBaseCoin(dto.getBaseCoin());
        s.setQuoteCoin(dto.getQuoteCoin());
        s.setCategory(dto.getCategory());
        s.setTradeType(tradeType);
        s.setAlltickCode(dto.getAlltickCode());
        s.setPrimarySource(pickString(dto.getPrimarySource(), s.getPrimarySource()));
        s.setPrimarySymbol(pickString(dto.getPrimarySymbol(), s.getPrimarySymbol()));
        s.setBackupSource(pickString(dto.getBackupSource(), s.getBackupSource()));
        s.setBackupSymbol(pickString(dto.getBackupSymbol(), s.getBackupSymbol()));
        s.setKlineSource(pickString(dto.getKlineSource(), s.getKlineSource()));
        s.setKlineSymbol(pickString(dto.getKlineSymbol(), s.getKlineSymbol()));
        s.setDepthSource(pickString(dto.getDepthSource(), s.getDepthSource()));
        s.setDepthSymbol(pickString(dto.getDepthSymbol(), s.getDepthSymbol()));
        s.setTradeSource(pickString(dto.getTradeSource(), s.getTradeSource()));
        s.setTradeSymbol(pickString(dto.getTradeSymbol(), s.getTradeSymbol()));
        s.setWsSource(pickString(dto.getWsSource(), s.getWsSource()));
        s.setWsSymbol(pickString(dto.getWsSymbol(), s.getWsSymbol()));
        s.setStatsMode(pickString(dto.getStatsMode(), s.getStatsMode()));
        s.setDepthMode(pickString(dto.getDepthMode(), s.getDepthMode()));
        s.setTradeMode(pickString(dto.getTradeMode(), s.getTradeMode()));
        s.setSubscribeEnabled(pickInt(dto.getSubscribeEnabled(), s.getSubscribeEnabled()));
        s.setPricePrecision(dto.getPricePrecision());
        s.setAmountPrecision(dto.getAmountPrecision());
        s.setChangePrecision(dto.getChangePrecision());
        s.setMinAmount(dto.getMinAmount());
        s.setMaxLeverage("perp".equals(tradeType) ? Math.max(1, dto.getMaxLeverage()) : 1);
        s.setTakerFee(dto.getTakerFee());
        s.setMakerFee(dto.getMakerFee());
        s.setEnabled(dto.getEnabled());
        s.setIsHot(dto.getIsHot());
        s.setSort(dto.getSort());
        applySymbolSourceDefaults(s);
        if (s.getId() == null) symbolMapper.insert(s);
        else symbolMapper.updateById(s);
    }

    private void normalizeSymbolModel(Symbol dto) {
        dto.setSymbol(SymbolService.normalizeSymbol(required(dto.getSymbol(), "symbol")));
        dto.setBaseCoin(required(dto.getBaseCoin(), "baseCoin").toUpperCase());
        dto.setQuoteCoin(required(dto.getQuoteCoin(), "quoteCoin").toUpperCase());
        dto.setCategory(normalizeCategory(dto.getCategory()));
        dto.setAlltickCode(defaultValue(dto.getAlltickCode(), dto.getSymbol().replace("-", "")));
        dto.setChangePrecision(normalizeChangePrecision(dto.getChangePrecision()));
        if (dto.getId() == null || hasSourcePayload(dto)) {
            applySymbolSourceDefaults(dto);
        }
    }

    private void applySymbolSourceDefaults(Symbol dto) {
        boolean crypto = isCryptoCategory(dto.getCategory());
        boolean forex = isForexCategory(dto.getCategory());
        String sourceSymbol = defaultValue(dto.getPrimarySymbol(), dto.getAlltickCode());
        dto.setPrimarySource(defaultValue(dto.getPrimarySource(), defaultPrimarySource(dto.getCategory(), crypto, forex)));
        dto.setPrimarySymbol(sourceSymbol);
        dto.setBackupSource(resolveBackupSource(dto.getBackupSource(), crypto));
        dto.setBackupSymbol(blankToNull(dto.getBackupSymbol()));
        dto.setKlineSource(defaultValue(dto.getKlineSource(), dto.getPrimarySource()));
        dto.setKlineSymbol(defaultValue(dto.getKlineSymbol(), dto.getPrimarySymbol()));
        dto.setDepthSource(defaultValue(dto.getDepthSource(), dto.getPrimarySource()));
        dto.setDepthSymbol(defaultValue(dto.getDepthSymbol(), dto.getPrimarySymbol()));
        dto.setTradeSource(defaultValue(dto.getTradeSource(), dto.getPrimarySource()));
        dto.setTradeSymbol(defaultValue(dto.getTradeSymbol(), dto.getPrimarySymbol()));
        dto.setWsSource(defaultValue(dto.getWsSource(), dto.getPrimarySource()));
        dto.setWsSymbol(defaultValue(dto.getWsSymbol(), dto.getPrimarySymbol()));
        dto.setStatsMode(defaultValue(dto.getStatsMode(), defaultStatsMode(crypto, forex)));
        dto.setDepthMode(defaultValue(dto.getDepthMode(), defaultDepthMode(crypto, forex)));
        dto.setTradeMode(defaultValue(dto.getTradeMode(), defaultTradeMode(crypto, forex)));
        dto.setSubscribeEnabled(defaultInt(dto.getSubscribeEnabled(), forex ? 1 : 0));
    }

    private boolean isCryptoCategory(String category) {
        return "crypto".equalsIgnoreCase(category);
    }

    private boolean isForexCategory(String category) {
        return "forex".equalsIgnoreCase(category);
    }

    private String normalizeCategory(String category) {
        String normalized = blankToNull(category);
        if (normalized == null) return "crypto";
        return switch (normalized.toLowerCase()) {
            case "crypto", "forex", "metal", "commodity", "index", "stock" -> normalized.toLowerCase();
            case "energy" -> "commodity";
            default -> "crypto";
        };
    }

    private String resolveBackupSource(String backupSource, boolean crypto) {
        String normalized = blankToNull(backupSource);
        if (normalized != null) return normalized;
        return crypto ? "htx" : null;
    }

    private String defaultPrimarySource(String category, boolean crypto, boolean forex) {
        if (crypto) return "binance";
        if (forex) return "wallstreetcn";
        return isHtxSwapCategory(category) ? "htx_swap" : "alltick";
    }

    private String defaultStatsMode(boolean crypto, boolean forex) {
        if (crypto) return "source";
        if (forex) return "calc";
        return "source";
    }

    private String defaultDepthMode(boolean crypto, boolean forex) {
        if (crypto) return "native";
        if (forex) return "native";
        return "native";
    }

    private String defaultTradeMode(boolean crypto, boolean forex) {
        if (crypto) return "native";
        if (forex) return "native";
        return "native";
    }

    private boolean isHtxSwapCategory(String category) {
        return "metal".equalsIgnoreCase(category)
                || "commodity".equalsIgnoreCase(category)
                || "index".equalsIgnoreCase(category)
                || "stock".equalsIgnoreCase(category);
    }

    private String required(String value, String field) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(field + " required");
        return value.trim();
    }

    private String defaultValue(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private Integer defaultInt(Integer value, int fallback) {
        return value == null ? fallback : value;
    }

    private BigDecimal defaultDecimal(BigDecimal value, String fallback) {
        return value == null ? new BigDecimal(fallback) : value;
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String pickString(String incoming, String existing) {
        String normalized = blankToNull(incoming);
        return normalized != null ? normalized : existing;
    }

    private Integer pickInt(Integer incoming, Integer existing) {
        return incoming != null ? incoming : existing;
    }

    private boolean hasSourcePayload(Symbol dto) {
        return dto.getPrimarySource() != null
                || dto.getPrimarySymbol() != null
                || dto.getBackupSource() != null
                || dto.getBackupSymbol() != null
                || dto.getKlineSource() != null
                || dto.getKlineSymbol() != null
                || dto.getDepthSource() != null
                || dto.getDepthSymbol() != null
                || dto.getTradeSource() != null
                || dto.getTradeSymbol() != null
                || dto.getWsSource() != null
                || dto.getWsSymbol() != null
                || dto.getStatsMode() != null
                || dto.getDepthMode() != null
                || dto.getTradeMode() != null
                || dto.getSubscribeEnabled() != null;
    }

    @Data
    public static class SymbolProductDTO {
        private String symbol;
        private String baseCoin;
        private String quoteCoin;
        private String category;
        private String alltickCode;
        private String primarySource;
        private String primarySymbol;
        private String backupSource;
        private String backupSymbol;
        private String klineSource;
        private String klineSymbol;
        private String depthSource;
        private String depthSymbol;
        private String tradeSource;
        private String tradeSymbol;
        private String wsSource;
        private String wsSymbol;
        private String statsMode;
        private String depthMode;
        private String tradeMode;
        private Integer subscribeEnabled;
        private Integer pricePrecision;
        private Integer amountPrecision;
        private Integer changePrecision;
        private BigDecimal minAmount;
        private Integer maxLeverage;
        private BigDecimal takerFee;
        private BigDecimal makerFee;
        private Integer enabled;
        private Integer isHot;
        private Integer sort;
        private boolean supportSpot;
        private boolean supportPerp;
        private boolean supportOption;
    }

    @Data
    public static class SymbolQuoteCheckDTO {
        private Integer id;
        private String symbol;
        private String tradeType;
        private String category;
        private String baseCoin;
        private String quoteCoin;
        private Integer enabled;
        private Integer subscribeEnabled;
        private String primarySource;
        private String primarySymbol;
        private String wsSource;
        private String wsSymbol;
        private String klineSource;
        private String klineSymbol;
        private boolean tickOk;
        private boolean statsOk;
        private boolean klineOk;
        private String price;
        private String change;
        private String statsClose;
        private Integer klineCount;
        private String suspectReason;
        private Map<String, String> routeInfo;
    }

    // ========== 币种 ==========

    @GetMapping("/coin/list")
    public R<List<Coin>> coinList() {
        return R.ok(coinMapper.selectList(new LambdaQueryWrapper<Coin>().orderByAsc(Coin::getSort)));
    }

    @PostMapping("/coin/save")
    public R<Coin> coinSave(@RequestBody Coin dto) {
        normalizeCoin(dto);
        if (dto.getId() != null) coinMapper.updateById(dto);
        else coinMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "coin_save",
                "coin", String.valueOf(dto.getId()), dto.getCode());
        return R.ok(dto);
    }

    @PostMapping("/coin/{id}/delete")
    public R<Void> coinDelete(@PathVariable Integer id) {
        coinMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "coin_delete",
                "coin", String.valueOf(id), null);
        return R.ok();
    }

    private void normalizeCoin(Coin dto) {
        boolean insert = dto.getId() == null;
        if (dto.getCode() != null) dto.setCode(dto.getCode().trim().toUpperCase());
        if (dto.getName() != null) dto.setName(dto.getName().trim());
        if (dto.getLogo() != null) dto.setLogo(normalizeCoinLogo(dto.getLogo()));
        if (insert || dto.getAssetCategory() != null) dto.setAssetCategory(normalizeAssetCategory(dto.getAssetCategory()));
        if (insert || dto.getWalletEnabled() != null) dto.setWalletEnabled(defaultInt(dto.getWalletEnabled(), 1));
        if (insert || dto.getMarketEnabled() != null) dto.setMarketEnabled(defaultInt(dto.getMarketEnabled(), 1));
        if (dto.getLogoStatus() == null && (insert || dto.getLogo() != null)) {
            dto.setLogoStatus(blankToNull(dto.getLogo()) == null ? 0 : 1);
        }
    }

    private String normalizeAssetCategory(String category) {
        String normalized = blankToNull(category);
        if (normalized == null) return "crypto";
        return switch (normalized.toLowerCase()) {
            case "crypto", "fiat", "metal", "commodity", "index", "stock" -> normalized.toLowerCase();
            case "energy" -> "commodity";
            default -> "crypto";
        };
    }

    private String normalizeCoinLogo(String value) {
        String normalized = blankToNull(value);
        if (normalized == null) return null;
        if (normalized.startsWith("/api/uploads/")) return normalized.substring(4);
        if (normalized.startsWith("api/uploads/")) return "/" + normalized.substring(4);
        if (normalized.startsWith("/uploads/")) return normalized;
        if (normalized.startsWith("uploads/")) return "/" + normalized;

        int apiUploadsIndex = normalized.indexOf("/api/uploads/");
        if (apiUploadsIndex >= 0) return normalized.substring(apiUploadsIndex + 4);

        int uploadsIndex = normalized.indexOf("/uploads/");
        if (uploadsIndex >= 0) return normalized.substring(uploadsIndex);

        return normalized;
    }

    // ========== 新闻 ==========

    @GetMapping("/news/page")
    public R<Page<News>> newsPage(@RequestParam(required = false) String lang,
                                  @RequestParam(defaultValue = "1") int pageNo,
                                  @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<News> w = new LambdaQueryWrapper<>();
        if (lang != null && !lang.isBlank()) w.eq(News::getLang, lang);
        w.orderByDesc(News::getId);
        return R.ok(newsMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/news/save")
    public R<News> newsSave(@RequestBody News dto) {
        News saved = newsService.save(dto);
        logService.log(authService.currentAdminId(), "content", "news_save",
                "news", String.valueOf(saved.getId()), saved.getTitle());
        return R.ok(saved);
    }

    @PostMapping("/news/{id}/delete")
    public R<Void> newsDelete(@PathVariable Long id) {
        newsMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "news_delete",
                "news", String.valueOf(id), null);
        return R.ok();
    }

    @PostMapping("/news/sync")
    public R<NewsSyncService.SyncResult> newsSync() {
        NewsSyncService.SyncResult result = newsSyncService.syncRemoteNews();
        logService.log(authService.currentAdminId(), "content", "news_sync",
                "news", "remote", "fetched=" + result.fetched() + ", inserted=" + result.inserted() + ", processed=" + result.processed());
        return R.ok(result);
    }

    // ========== 公告 ==========

    @GetMapping("/announcement/page")
    public R<Page<Announcement>> announcementPage(@RequestParam(required = false) String lang,
                                                  @RequestParam(required = false) Integer published,
                                                  @RequestParam(defaultValue = "1") int pageNo,
                                                  @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<Announcement> w = new LambdaQueryWrapper<>();
        if (lang != null && !lang.isBlank()) w.eq(Announcement::getLang, lang);
        if (published != null) w.eq(Announcement::getPublished, published);
        w.orderByDesc(Announcement::getTop).orderByDesc(Announcement::getId);
        return R.ok(announcementMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/announcement/save")
    public R<Announcement> announcementSave(@RequestBody Announcement dto) {
        if (dto.getId() != null) announcementMapper.updateById(dto);
        else announcementMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "announcement_save",
                "announcement", String.valueOf(dto.getId()), dto.getTitle());
        return R.ok(dto);
    }

    @PostMapping("/announcement/{id}/delete")
    public R<Void> announcementDelete(@PathVariable Integer id) {
        announcementMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "announcement_delete",
                "announcement", String.valueOf(id), null);
        return R.ok();
    }

    // ========== Banner ==========

    @GetMapping("/banner/page")
    public R<Page<Banner>> bannerPage(@RequestParam(required = false) String position,
                                      @RequestParam(required = false) String lang,
                                      @RequestParam(defaultValue = "1") int pageNo,
                                      @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<Banner> w = new LambdaQueryWrapper<>();
        if (position != null && !position.isBlank()) w.eq(Banner::getPosition, position);
        if (lang != null && !lang.isBlank()) w.eq(Banner::getLang, lang);
        w.orderByAsc(Banner::getSort).orderByDesc(Banner::getId);
        return R.ok(bannerMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/banner/save")
    public R<Banner> bannerSave(@RequestBody Banner dto) {
        if (dto.getId() != null) bannerMapper.updateById(dto);
        else bannerMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "banner_save",
                "banner", String.valueOf(dto.getId()), dto.getTitle());
        return R.ok(dto);
    }

    @PostMapping("/banner/{id}/delete")
    public R<Void> bannerDelete(@PathVariable Integer id) {
        bannerMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "banner_delete",
                "banner", String.valueOf(id), null);
        return R.ok();
    }

    // ========== 理财产品（锁仓） ==========

    @GetMapping("/lock-product/list")
    public R<List<LockProduct>> lockList() {
        return R.ok(lockProductMapper.selectList(new LambdaQueryWrapper<LockProduct>()
                .orderByAsc(LockProduct::getSort)));
    }

    @PostMapping("/lock-product/save")
    public R<LockProduct> lockSave(@RequestBody LockProduct dto) {
        if (dto.getId() != null) lockProductMapper.updateById(dto);
        else lockProductMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "lock_save",
                "lock_product", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/lock-product/{id}/delete")
    public R<Void> lockDelete(@PathVariable Integer id) {
        lockProductMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "lock_delete",
                "lock_product", String.valueOf(id), null);
        return R.ok();
    }

    // ========== 投资组合 ==========

    @GetMapping("/portfolio-product/list")
    public R<List<PortfolioProduct>> portfolioList() {
        return R.ok(portfolioProductMapper.selectList(new LambdaQueryWrapper<PortfolioProduct>()
                .orderByAsc(PortfolioProduct::getSort)));
    }

    @PostMapping("/portfolio-product/save")
    public R<PortfolioProduct> portfolioSave(@RequestBody PortfolioProduct dto) {
        if (dto.getId() != null) portfolioProductMapper.updateById(dto);
        else portfolioProductMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "portfolio_save",
                "portfolio_product", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/portfolio-product/{id}/delete")
    public R<Void> portfolioDelete(@PathVariable Integer id) {
        portfolioProductMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "portfolio_delete",
                "portfolio_product", String.valueOf(id), null);
        return R.ok();
    }

    // ========== 借币产品 ==========

    @GetMapping("/loan-product/list")
    public R<List<LoanProduct>> loanList() {
        return R.ok(loanProductMapper.selectList(new LambdaQueryWrapper<LoanProduct>().orderByAsc(LoanProduct::getId)));
    }

    @PostMapping("/loan-product/save")
    public R<LoanProduct> loanSave(@RequestBody LoanProduct dto) {
        if (dto.getId() != null) loanProductMapper.updateById(dto);
        else loanProductMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "loan_save",
                "loan_product", String.valueOf(dto.getId()), dto.getCoin());
        return R.ok(dto);
    }

    @PostMapping("/loan-product/{id}/delete")
    public R<Void> loanDelete(@PathVariable Integer id) {
        loanProductMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "loan_delete",
                "loan_product", String.valueOf(id), null);
        return R.ok();
    }

    // ========== AI 策略 ==========

    @GetMapping("/ai-strategy/list")
    public R<List<AiStrategy>> aiList() {
        return R.ok(aiStrategyMapper.selectList(new LambdaQueryWrapper<AiStrategy>().orderByDesc(AiStrategy::getUserCount)));
    }

    @PostMapping("/ai-strategy/save")
    public R<AiStrategy> aiSave(@RequestBody AiStrategy dto) {
        if (dto.getId() != null) aiStrategyMapper.updateById(dto);
        else aiStrategyMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "ai_save",
                "ai_strategy", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/ai-strategy/{id}/delete")
    public R<Void> aiDelete(@PathVariable Integer id) {
        aiStrategyMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "ai_delete",
                "ai_strategy", String.valueOf(id), null);
        return R.ok();
    }

    // ========== NFT ==========

    @GetMapping("/nft-collection/list")
    public R<List<NftCollection>> nftCollectionList() {
        return R.ok(nftCollectionMapper.selectList(new LambdaQueryWrapper<NftCollection>()
                .orderByAsc(NftCollection::getSort)));
    }

    @PostMapping("/nft-collection/save")
    public R<NftCollection> nftCollectionSave(@RequestBody NftCollection dto) {
        if (dto.getId() != null) nftCollectionMapper.updateById(dto);
        else nftCollectionMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "nft_collection_save",
                "nft_collection", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/nft-collection/{id}/delete")
    public R<Void> nftCollectionDelete(@PathVariable Integer id) {
        nftCollectionMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "nft_collection_delete",
                "nft_collection", String.valueOf(id), null);
        return R.ok();
    }

    @GetMapping("/nft-item/page")
    public R<Page<NftItem>> nftItemPage(@RequestParam(required = false) Integer collectionId,
                                        @RequestParam(defaultValue = "1") int pageNo,
                                        @RequestParam(defaultValue = "20") int pageSize) {
        LambdaQueryWrapper<NftItem> w = new LambdaQueryWrapper<>();
        if (collectionId != null) w.eq(NftItem::getCollectionId, collectionId);
        w.orderByDesc(NftItem::getId);
        return R.ok(nftItemMapper.selectPage(com.asterpro.common.util.PageUtil.page(pageNo, pageSize), w));
    }

    @PostMapping("/nft-item/save")
    public R<NftItem> nftItemSave(@RequestBody NftItem dto) {
        if (dto.getId() != null) nftItemMapper.updateById(dto);
        else nftItemMapper.insert(dto);
        logService.log(authService.currentAdminId(), "content", "nft_item_save",
                "nft_item", String.valueOf(dto.getId()), dto.getName());
        return R.ok(dto);
    }

    @PostMapping("/nft-item/{id}/delete")
    public R<Void> nftItemDelete(@PathVariable Long id) {
        nftItemMapper.deleteById(id);
        logService.log(authService.currentAdminId(), "content", "nft_item_delete",
                "nft_item", String.valueOf(id), null);
        return R.ok();
    }

    // ========== 客服工单 ==========

    @GetMapping("/feedback/page")
    public R<Page<Feedback>> feedbackPage(@RequestParam(required = false) Integer status,
                                          @RequestParam(defaultValue = "1") int pageNo,
                                          @RequestParam(defaultValue = "20") int pageSize) {
        return R.ok(legacyFeedbackCompatService.pageAdmin(status, pageNo, pageSize));
    }

    @PostMapping("/feedback/reply")
    public R<Feedback> feedbackReply(@RequestBody Feedback dto) {
        if (dto == null || dto.getId() == null) {
            return R.ok();
        }
        Feedback f = legacyFeedbackCompatService.adminReply(authService.currentAdminId(), dto.getId(), dto.getStatus(), dto.getReply());
        logService.log(authService.currentAdminId(), "content", "feedback_reply",
                "feedback", String.valueOf(f.getId()), f.getCategory());
        return R.ok(f);
    }
}
