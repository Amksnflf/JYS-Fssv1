export interface CountryCodeItem {
  code: string;
  nameZh: string;
  nameEn: string;
  flag: string;
  iso2: string;
}

export const POPULAR_COUNTRY_CODES = [
  '86',   // 中国
  '852',  // 中国香港
  '886',  // 中国台湾
  '853',  // 中国澳门
  '1',    // 美国
  '81',   // 日本
  '82',   // 韩国
  '65',   // 新加坡
  '44',   // 英国
  '61',   // 澳大利亚
  '60',   // 马来西亚
  '49',   // 德国
  '33',   // 法国
  '7',    // 俄罗斯
  '84',   // 越南
  '66',   // 泰国
  '62',   // 印度尼西亚
  '63',   // 菲律宾
  '971',  // 阿联酋
  '91',   // 印度
  '55',   // 巴西
  '90',   // 土耳其
];

export const COUNTRY_LIST: CountryCodeItem[] = [
  // 核心常用 / 亚洲核心
  { code: '86', nameZh: '中国', nameEn: 'China', flag: '🇨🇳', iso2: 'CN' },
  { code: '852', nameZh: '中国香港', nameEn: 'Hong Kong', flag: '🇭🇰', iso2: 'HK' },
  { code: '886', nameZh: '中国台湾', nameEn: 'Taiwan', flag: '🌐', iso2: 'TW' },
  { code: '853', nameZh: '中国澳门', nameEn: 'Macau', flag: '🇲🇴', iso2: 'MO' },
  { code: '1', nameZh: '美国', nameEn: 'United States', flag: '🇺🇸', iso2: 'US' },
  { code: '1', nameZh: '加拿大', nameEn: 'Canada', flag: '🇨🇦', iso2: 'CA' },
  { code: '81', nameZh: '日本', nameEn: 'Japan', flag: '🇯🇵', iso2: 'JP' },
  { code: '82', nameZh: '韩国', nameEn: 'South Korea', flag: '🇰🇷', iso2: 'KR' },
  { code: '65', nameZh: '新加坡', nameEn: 'Singapore', flag: '🇸🇬', iso2: 'SG' },
  { code: '60', nameZh: '马来西亚', nameEn: 'Malaysia', flag: '🇲🇾', iso2: 'MY' },
  { code: '66', nameZh: '泰国', nameEn: 'Thailand', flag: '🇹🇭', iso2: 'TH' },
  { code: '84', nameZh: '越南', nameEn: 'Vietnam', flag: '🇻🇳', iso2: 'VN' },
  { code: '62', nameZh: '印度尼西亚', nameEn: 'Indonesia', flag: '🇮🇩', iso2: 'ID' },
  { code: '63', nameZh: '菲律宾', nameEn: 'Philippines', flag: '🇵🇭', iso2: 'PH' },
  { code: '44', nameZh: '英国', nameEn: 'United Kingdom', flag: '🇬🇧', iso2: 'GB' },
  { code: '61', nameZh: '澳大利亚', nameEn: 'Australia', flag: '🇦🇺', iso2: 'AU' },
  { code: '49', nameZh: '德国', nameEn: 'Germany', flag: '🇩🇪', iso2: 'DE' },
  { code: '33', nameZh: '法国', nameEn: 'France', flag: '🇫🇷', iso2: 'FR' },
  { code: '7', nameZh: '俄罗斯', nameEn: 'Russia', flag: '🇷🇺', iso2: 'RU' },
  { code: '971', nameZh: '阿联酋', nameEn: 'United Arab Emirates', flag: '🇦🇪', iso2: 'AE' },
  { code: '91', nameZh: '印度', nameEn: 'India', flag: '🇮🇳', iso2: 'IN' },
  { code: '55', nameZh: '巴西', nameEn: 'Brazil', flag: '🇧🇷', iso2: 'BR' },
  { code: '90', nameZh: '土耳其', nameEn: 'Turkey', flag: '🇹🇷', iso2: 'TR' },
  { code: '64', nameZh: '新西兰', nameEn: 'New Zealand', flag: '🇳🇿', iso2: 'NZ' },
  { code: '39', nameZh: '意大利', nameEn: 'Italy', flag: '🇮🇹', iso2: 'IT' },
  { code: '34', nameZh: '西班牙', nameEn: 'Spain', flag: '🇪🇸', iso2: 'ES' },
  { code: '31', nameZh: '荷兰', nameEn: 'Netherlands', flag: '🇳🇱', iso2: 'NL' },
  { code: '41', nameZh: '瑞士', nameEn: 'Switzerland', flag: '🇨🇭', iso2: 'CH' },
  { code: '46', nameZh: '瑞典', nameEn: 'Sweden', flag: '🇸🇪', iso2: 'SE' },
  { code: '47', nameZh: '挪威', nameEn: 'Norway', flag: '🇳🇴', iso2: 'NO' },
  { code: '358', nameZh: '芬兰', nameEn: 'Finland', flag: '🇫🇮', iso2: 'FI' },
  { code: '45', nameZh: '丹麦', nameEn: 'Denmark', flag: '🇩🇰', iso2: 'DK' },
  { code: '353', nameZh: '爱尔兰', nameEn: 'Ireland', flag: '🇮🇪', iso2: 'IE' },
  { code: '32', nameZh: '比利时', nameEn: 'Belgium', flag: '🇧🇪', iso2: 'BE' },
  { code: '43', nameZh: '奥地利', nameEn: 'Austria', flag: '🇦🇹', iso2: 'AT' },
  { code: '48', nameZh: '波兰', nameEn: 'Poland', flag: '🇵🇱', iso2: 'PL' },
  { code: '351', nameZh: '葡萄牙', nameEn: 'Portugal', flag: '🇵🇹', iso2: 'PT' },
  { code: '30', nameZh: '希腊', nameEn: 'Greece', flag: '🇬🇷', iso2: 'GR' },
  { code: '420', nameZh: '捷克', nameEn: 'Czech Republic', flag: '🇨🇿', iso2: 'CZ' },
  { code: '36', nameZh: '匈牙利', nameEn: 'Hungary', flag: '🇭🇺', iso2: 'HU' },
  { code: '40', nameZh: '罗马尼亚', nameEn: 'Romania', flag: '🇷🇴', iso2: 'RO' },
  { code: '966', nameZh: '沙特阿拉伯', nameEn: 'Saudi Arabia', flag: '🇸🇦', iso2: 'SA' },
  { code: '974', nameZh: '卡塔尔', nameEn: 'Qatar', flag: '🇶🇦', iso2: 'QA' },
  { code: '965', nameZh: '科威特', nameEn: 'Kuwait', flag: '🇰🇼', iso2: 'KW' },
  { code: '973', nameZh: '巴林', nameEn: 'Bahrain', flag: '🇧🇭', iso2: 'BH' },
  { code: '968', nameZh: '阿曼', nameEn: 'Oman', flag: '🇴🇲', iso2: 'OM' },
  { code: '972', nameZh: '以色列', nameEn: 'Israel', flag: '🇮🇱', iso2: 'IL' },
  { code: '20', nameZh: '埃及', nameEn: 'Egypt', flag: '🇪🇬', iso2: 'EG' },
  { code: '27', nameZh: '南非', nameEn: 'South Africa', flag: '🇿🇦', iso2: 'ZA' },
  { code: '234', nameZh: '尼日利亚', nameEn: 'Nigeria', flag: '🇳🇬', iso2: 'NG' },
  { code: '254', nameZh: '肯尼亚', nameEn: 'Kenya', flag: '🇰🇪', iso2: 'KE' },
  { code: '233', nameZh: '加纳', nameEn: 'Ghana', flag: '🇬🇭', iso2: 'GH' },
  { code: '52', nameZh: '墨西哥', nameEn: 'Mexico', flag: '🇲🇽', iso2: 'MX' },
  { code: '54', nameZh: '阿根廷', nameEn: 'Argentina', flag: '🇦🇷', iso2: 'AR' },
  { code: '56', nameZh: '智利', nameEn: 'Chile', flag: '🇨🇱', iso2: 'CL' },
  { code: '57', nameZh: '哥伦比亚', nameEn: 'Colombia', flag: '🇨🇴', iso2: 'CO' },
  { code: '51', nameZh: '秘鲁', nameEn: 'Peru', flag: '🇵🇪', iso2: 'PE' },
  { code: '92', nameZh: '巴基斯坦', nameEn: 'Pakistan', flag: '🇵🇰', iso2: 'PK' },
  { code: '880', nameZh: '孟加拉国', nameEn: 'Bangladesh', flag: '🇧🇩', iso2: 'BD' },
  { code: '94', nameZh: '斯里兰卡', nameEn: 'Sri Lanka', flag: '🇱🇰', iso2: 'LK' },
  { code: '977', nameZh: '尼泊尔', nameEn: 'Nepal', flag: '🇳🇵', iso2: 'NP' },
  { code: '95', nameZh: '缅甸', nameEn: 'Myanmar', flag: '🇲🇲', iso2: 'MM' },
  { code: '855', nameZh: '柬埔寨', nameEn: 'Cambodia', flag: '🇰🇭', iso2: 'KH' },
  { code: '856', nameZh: '老挝', nameEn: 'Laos', flag: '🇱🇦', iso2: 'LA' },
  { code: '976', nameZh: '蒙古', nameEn: 'Mongolia', flag: '🇲🇳', iso2: 'MN' },
  { code: '7', nameZh: '哈萨克斯坦', nameEn: 'Kazakhstan', flag: '🇰🇿', iso2: 'KZ' },
  { code: '998', nameZh: '乌兹别克斯坦', nameEn: 'Uzbekistan', flag: '🇺🇿', iso2: 'UZ' },
  { code: '996', nameZh: '吉尔吉斯斯坦', nameEn: 'Kyrgyzstan', flag: '🇰🇬', iso2: 'KG' },
  { code: '380', nameZh: '乌克兰', nameEn: 'Ukraine', flag: '🇺🇦', iso2: 'UA' },
  { code: '375', nameZh: '白俄罗斯', nameEn: 'Belarus', flag: '🇧🇾', iso2: 'BY' },
  { code: '371', nameZh: '拉脱维亚', nameEn: 'Latvia', flag: '🇱🇻', iso2: 'LV' },
  { code: '370', nameZh: '立陶宛', nameEn: 'Lithuania', flag: '🇱🇹', iso2: 'LT' },
  { code: '372', nameZh: '爱沙尼亚', nameEn: 'Estonia', flag: '🇪🇪', iso2: 'EE' },
  { code: '354', nameZh: '冰岛', nameEn: 'Iceland', flag: '🇮🇸', iso2: 'IS' },
  { code: '352', nameZh: '卢森堡', nameEn: 'Luxembourg', flag: '🇱🇺', iso2: 'LU' },
  { code: '356', nameZh: '马耳他', nameEn: 'Malta', flag: '🇲🇹', iso2: 'MT' },
  { code: '357', nameZh: '塞浦路斯', nameEn: 'Cyprus', flag: '🇨🇾', iso2: 'CY' },
  { code: '385', nameZh: '克罗地亚', nameEn: 'Croatia', flag: '🇭🇷', iso2: 'HR' },
  { code: '381', nameZh: '塞尔维亚', nameEn: 'Serbia', flag: '🇷🇸', iso2: 'RS' },
  { code: '359', nameZh: '保加利亚', nameEn: 'Bulgaria', flag: '🇧🇬', iso2: 'BG' },
  { code: '421', nameZh: '斯洛伐克', nameEn: 'Slovakia', flag: '🇸🇰', iso2: 'SK' },
  { code: '386', nameZh: '斯洛文尼亚', nameEn: 'Slovenia', flag: '🇸🇮', iso2: 'SI' },
  { code: '962', nameZh: '约旦', nameEn: 'Jordan', flag: '🇯🇴', iso2: 'JO' },
  { code: '961', nameZh: '黎巴嫩', nameEn: 'Lebanon', flag: '🇱🇧', iso2: 'LB' },
  { code: '964', nameZh: '伊拉克', nameEn: 'Iraq', flag: '🇮🇶', iso2: 'IQ' },
  { code: '212', nameZh: '摩洛哥', nameEn: 'Morocco', flag: '🇲🇦', iso2: 'MA' },
  { code: '216', nameZh: '突尼斯', nameEn: 'Tunisia', flag: '🇹🇳', iso2: 'TN' },
  { code: '213', nameZh: '阿尔及利亚', nameEn: 'Algeria', flag: '🇩🇿', iso2: 'DZ' },
  { code: '506', nameZh: '哥斯达黎加', nameEn: 'Costa Rica', flag: '🇨🇷', iso2: 'CR' },
  { code: '507', nameZh: '巴拿马', nameEn: 'Panama', flag: '🇵🇦', iso2: 'PA' },
  { code: '593', nameZh: '厄瓜多尔', nameEn: 'Ecuador', flag: '🇪🇨', iso2: 'EC' },
  { code: '598', nameZh: '乌拉圭', nameEn: 'Uruguay', flag: '🇺🇾', iso2: 'UY' },
  { code: '595', nameZh: '巴拉圭', nameEn: 'Paraguay', flag: '🇵🇾', iso2: 'PY' },
  { code: '58', nameZh: '委内瑞拉', nameEn: 'Venezuela', flag: '🇻🇪', iso2: 'VE' },
];

export function findCountryByCode(code: string): CountryCodeItem | undefined {
  if (!code) return undefined;
  const cleanCode = code.replace(/\D/g, '');
  return COUNTRY_LIST.find((c) => c.code === cleanCode);
}

export function searchCountries(query: string): CountryCodeItem[] {
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  if (!q) return COUNTRY_LIST;

  return COUNTRY_LIST.filter((item) => {
    return (
      item.code.includes(q) ||
      item.nameZh.toLowerCase().includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.iso2.toLowerCase().includes(q)
    );
  });
}
