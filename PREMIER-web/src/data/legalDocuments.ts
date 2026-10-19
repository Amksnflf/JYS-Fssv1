export type LegalDocumentKey = 'terms' | 'privacy' | 'aml';

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type LegalDocument = {
  title: string;
  intro: string;
  updatedAt: string;
  sections: LegalSection[];
};

type LegalDocumentLocale = Record<LegalDocumentKey, LegalDocument>;

type AgreementCopy = {
  prefix: string;
  afterPrefix: string;
  betweenTermsAndPrivacy: string;
  betweenPrivacyAndAml: string;
  suffix: string;
};

const zhCNDocuments: LegalDocumentLocale = {
  terms: {
    title: '服务条款',
    intro: '本服务条款适用于您使用 PREMIER 提供的网站、移动端页面、钱包登录以及相关交易与账户服务。',
    updatedAt: '最后更新：2026-06-10',
    sections: [
      {
        title: '一、账户与资格',
        paragraphs: [
          '您应当确保注册、登录、身份认证及钱包授权时提交的信息真实、完整且持续有效，并自行妥善保管账号、密码、验证码、私钥或钱包签名权限。',
          '如因您主动泄露、授权不当、设备中毒、钓鱼链接或其他非平台原因造成的损失，平台有权依据实际情况协助核查，但不对由此直接产生的损失承担保证责任。',
        ],
      },
      {
        title: '二、服务内容与风险',
        paragraphs: [
          '平台可向您提供行情展示、现货交易、合约、理财、充提、客服及其他数字资产相关服务，具体以页面实际开放内容为准。',
          '数字资产价格波动较大，您应独立判断风险承受能力。任何页面展示、收益说明、历史数据或客服答复均不构成保本承诺或投资建议。',
        ],
      },
      {
        title: '三、用户义务',
        paragraphs: [
          '您不得利用平台从事违法违规、欺诈、操纵市场、洗钱、套现、侵害第三方权益或干扰系统安全稳定运行的行为。',
          '如平台发现异常登录、异常交易、批量注册、违规营销或其他高风险行为，有权暂停相关功能、要求补充材料或限制服务。',
        ],
      },
      {
        title: '四、协议调整',
        paragraphs: [
          '平台可根据业务、监管或风控要求对本条款进行更新，并通过站内公告、弹窗、页面提示或其他合理方式通知您。',
          '您在条款更新后继续使用相关服务的，视为已阅读、理解并同意更新后的内容；如不同意，应立即停止使用相关服务。',
        ],
      },
    ],
  },
  privacy: {
    title: '隐私协议',
    intro: '本隐私协议用于说明 PREMIER 如何收集、使用、保存、共享和保护您的个人信息及设备信息。',
    updatedAt: '最后更新：2026-06-10',
    sections: [
      {
        title: '一、信息收集范围',
        paragraphs: [
          '为完成注册、登录、身份识别、风险控制、交易处理和客服支持，平台可能收集您的账号信息、联系方式、设备标识、访问日志、IP 信息、交易记录及身份认证材料。',
          '当您使用钱包登录、链上充提或第三方客服能力时，平台还可能处理您的钱包地址、签名结果、链上哈希或必要的页面交互记录。',
        ],
      },
      {
        title: '二、信息使用目的',
        paragraphs: [
          '我们会将收集到的信息用于身份验证、账户安全、订单撮合、风险识别、产品优化、客户通知、纠纷处理以及履行法律法规要求。',
          '在不识别您个人身份的前提下，平台可基于统计分析、性能监控或产品优化目的对部分数据进行聚合处理。',
        ],
      },
      {
        title: '三、信息共享与保存',
        paragraphs: [
          '除法律法规要求、监管机关指令、风控审查需要或为完成您主动发起的服务外，平台不会向无关第三方出售您的个人信息。',
          '平台会在实现服务目的及满足合规保存期限的必要范围内保留相关数据，并采取访问控制、日志审计、传输加密等合理保护措施。',
        ],
      },
      {
        title: '四、您的权利',
        paragraphs: [
          '您有权在平台支持范围内查询、更正、更新部分个人资料，并可依据账户状态申请注销或停止部分营销通知。',
          '如您对隐私处理存在疑问、投诉或删除请求，可通过平台客服或官方通知渠道联系我们，平台将在合理期限内处理。',
        ],
      },
    ],
  },
  aml: {
    title: '反洗钱协议',
    intro: '本反洗钱协议用于说明 PREMIER 在客户识别、交易监测、风险审查及可疑行为处置方面的基本规则。',
    updatedAt: '最后更新：2026-06-10',
    sections: [
      {
        title: '一、客户身份识别',
        paragraphs: [
          '为履行反洗钱、反恐怖融资及制裁筛查义务，平台有权根据账户风险等级要求您提交身份资料、资金来源说明或其他补充证明。',
          '若您拒绝配合、提交信息明显失实或无法通过核验，平台有权限制注册、登录、交易、充提或其他相关服务。',
        ],
      },
      {
        title: '二、交易监测与风险审查',
        paragraphs: [
          '平台会基于交易金额、频率、设备、地址关联、链上路径、异常模式及其他风险指标，对账户和订单进行持续监测与识别。',
          '对于存在分拆交易、异常套利、频繁划转、高风险地址往来或其他可疑特征的行为，平台可要求补充说明并进行人工复核。',
        ],
      },
      {
        title: '三、限制与处置',
        paragraphs: [
          '如平台合理怀疑相关账户、设备、钱包地址、订单或资金流向涉及洗钱、诈骗、地下钱庄、制裁规避或其他违法违规活动，平台可立即暂停服务或冻结部分功能。',
          '在必要情况下，平台可依照法律法规向有权机关报送可疑交易报告、配合调查取证并保留相关证据材料。',
        ],
      },
      {
        title: '四、用户承诺',
        paragraphs: [
          '您承诺使用平台的资金、账户及钱包来源合法，不代他人规避监管，不利用平台从事匿名洗钱、层化转移、非法集资或其他违法活动。',
          '您继续使用平台服务的，视为理解并同意平台基于合规和风控要求采取必要审查、限制和报告措施。',
        ],
      },
    ],
  },
};

const zhTWDocuments: LegalDocumentLocale = {
  terms: {
    title: '服務條款',
    intro: '本服務條款適用於您使用 PREMIER 提供的網站、行動端頁面、錢包登入以及相關交易與帳戶服務。',
    updatedAt: '最後更新：2026-06-10',
    sections: [
      {
        title: '一、帳戶與資格',
        paragraphs: [
          '您應確保註冊、登入、身份驗證及錢包授權時提交的資料真實、完整且持續有效，並自行妥善保管帳號、密碼、驗證碼、私鑰或錢包簽名權限。',
          '如因您主動洩露、授權不當、設備中毒、釣魚連結或其他非平台原因造成損失，平台可依實際情況協助核查，但不對由此直接產生的損失承擔保證責任。',
        ],
      },
      {
        title: '二、服務內容與風險',
        paragraphs: [
          '平台可向您提供行情展示、現貨交易、合約、理財、充提、客服及其他數位資產相關服務，具體以頁面實際開放內容為準。',
          '數位資產價格波動較大，您應獨立判斷風險承受能力。任何頁面展示、收益說明、歷史數據或客服答覆均不構成保本承諾或投資建議。',
        ],
      },
      {
        title: '三、使用者義務',
        paragraphs: [
          '您不得利用平台從事違法違規、詐騙、操縱市場、洗錢、套現、侵害第三方權益或干擾系統安全穩定運行的行為。',
          '如平台發現異常登入、異常交易、批量註冊、違規行銷或其他高風險行為，有權暫停相關功能、要求補充材料或限制服務。',
        ],
      },
      {
        title: '四、條款調整',
        paragraphs: [
          '平台可依據業務、監管或風控要求更新本條款，並透過站內公告、彈窗、頁面提示或其他合理方式通知您。',
          '您在條款更新後繼續使用相關服務的，視為已閱讀、理解並同意更新後內容；如不同意，應立即停止使用相關服務。',
        ],
      },
    ],
  },
  privacy: {
    title: '隱私協議',
    intro: '本隱私協議用於說明 PREMIER 如何蒐集、使用、保存、共享與保護您的個人資訊及設備資訊。',
    updatedAt: '最後更新：2026-06-10',
    sections: [
      {
        title: '一、資訊蒐集範圍',
        paragraphs: [
          '為完成註冊、登入、身份識別、風險控制、交易處理與客服支援，平台可能蒐集您的帳戶資訊、聯絡方式、設備識別碼、訪問日誌、IP 資訊、交易紀錄及身份驗證材料。',
          '當您使用錢包登入、鏈上充提或第三方客服能力時，平台也可能處理您的錢包地址、簽名結果、鏈上哈希或必要的頁面互動紀錄。',
        ],
      },
      {
        title: '二、資訊使用目的',
        paragraphs: [
          '我們會將蒐集到的資訊用於身份驗證、帳戶安全、訂單撮合、風險識別、產品優化、客戶通知、爭議處理以及履行法律法規要求。',
          '在不識別您個人身份的前提下，平台可基於統計分析、效能監控或產品優化目的，對部分資料進行聚合處理。',
        ],
      },
      {
        title: '三、資訊共享與保存',
        paragraphs: [
          '除法律法規要求、監管機關指令、風控審查需要，或為完成您主動發起的服務外，平台不會向無關第三方出售您的個人資訊。',
          '平台會在實現服務目的及滿足合規保存期限的必要範圍內保留相關資料，並採取訪問控制、日誌審計、傳輸加密等合理保護措施。',
        ],
      },
      {
        title: '四、您的權利',
        paragraphs: [
          '您有權在平台支援範圍內查詢、更正、更新部分個人資料，並可依帳戶狀態申請註銷或停止部分行銷通知。',
          '如您對隱私處理有疑問、投訴或刪除請求，可透過平台客服或官方通知渠道聯繫我們，平台將在合理期限內處理。',
        ],
      },
    ],
  },
  aml: {
    title: '反洗錢協議',
    intro: '本反洗錢協議用於說明 PREMIER 在客戶識別、交易監測、風險審查及可疑行為處置方面的基本規則。',
    updatedAt: '最後更新：2026-06-10',
    sections: [
      {
        title: '一、客戶身份識別',
        paragraphs: [
          '為履行反洗錢、反恐怖融資及制裁篩查義務，平台有權依據帳戶風險等級要求您提交身份資料、資金來源說明或其他補充證明。',
          '若您拒絕配合、提交資訊明顯失實或無法通過核驗，平台有權限制註冊、登入、交易、充提或其他相關服務。',
        ],
      },
      {
        title: '二、交易監測與風險審查',
        paragraphs: [
          '平台會基於交易金額、頻率、設備、地址關聯、鏈上路徑、異常模式及其他風險指標，對帳戶與訂單進行持續監測與識別。',
          '對於存在拆分交易、異常套利、頻繁劃轉、高風險地址往來或其他可疑特徵的行為，平台可要求補充說明並進行人工複核。',
        ],
      },
      {
        title: '三、限制與處置',
        paragraphs: [
          '如平台合理懷疑相關帳戶、設備、錢包地址、訂單或資金流向涉及洗錢、詐騙、地下錢莊、制裁規避或其他違法違規活動，平台可立即暫停服務或凍結部分功能。',
          '在必要情況下，平台可依照法律法規向有權機關報送可疑交易報告、配合調查取證並保留相關證據材料。',
        ],
      },
      {
        title: '四、使用者承諾',
        paragraphs: [
          '您承諾使用平台的資金、帳戶及錢包來源合法，不代他人規避監管，不利用平台從事匿名洗錢、層化轉移、非法集資或其他違法活動。',
          '您繼續使用平台服務的，視為理解並同意平台基於合規與風控要求採取必要審查、限制和報告措施。',
        ],
      },
    ],
  },
};

const enDocuments: LegalDocumentLocale = {
  terms: {
    title: 'Terms of Service',
    intro: 'These Terms of Service apply to your use of the PREMIER website, mobile pages, wallet login flow, and related account and trading services.',
    updatedAt: 'Last updated: 2026-06-10',
    sections: [
      {
        title: '1. Account and Eligibility',
        paragraphs: [
          'You must ensure that the information submitted during registration, login, identity verification, and wallet authorization is true, complete, and kept up to date. You are responsible for safeguarding your account, password, verification codes, private keys, and wallet signing permissions.',
          'If losses are caused by your own disclosure, improper authorization, infected devices, phishing links, or other non-platform reasons, the platform may assist with investigation but does not guarantee recovery or compensation.',
        ],
      },
      {
        title: '2. Services and Risks',
        paragraphs: [
          'The platform may provide market data, spot trading, derivatives, earn products, deposits and withdrawals, customer support, and other digital-asset services, subject to the actual features displayed on the page.',
          'Digital asset prices can fluctuate sharply. You should independently assess your risk tolerance. Any displayed yield, historical data, or support response does not constitute guaranteed profit or investment advice.',
        ],
      },
      {
        title: '3. User Obligations',
        paragraphs: [
          'You may not use the platform for illegal activities, fraud, market manipulation, money laundering, cash-out abuse, infringement of third-party rights, or interference with platform security and stability.',
          'If the platform detects abnormal logins, abnormal trading, mass registrations, abusive marketing, or other high-risk behavior, it may suspend related features, request additional materials, or restrict services.',
        ],
      },
      {
        title: '4. Updates to the Terms',
        paragraphs: [
          'The platform may update these terms according to business, regulatory, or risk-control requirements and will notify you through announcements, popups, page notices, or other reasonable methods.',
          'If you continue using the relevant services after an update takes effect, you are deemed to have read, understood, and accepted the updated terms.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'This Privacy Policy explains how PREMIER collects, uses, stores, shares, and protects your personal and device information.',
    updatedAt: 'Last updated: 2026-06-10',
    sections: [
      {
        title: '1. Information We Collect',
        paragraphs: [
          'To support registration, login, identity checks, risk control, transaction processing, and customer support, the platform may collect account details, contact information, device identifiers, access logs, IP data, transaction records, and identity-verification materials.',
          'When you use wallet login, on-chain deposits or withdrawals, or third-party support services, the platform may also process wallet addresses, signature results, blockchain hashes, or necessary interaction records.',
        ],
      },
      {
        title: '2. How We Use Information',
        paragraphs: [
          'We use collected information for identity verification, account security, order processing, risk detection, product improvement, customer communication, dispute handling, and compliance with applicable laws and regulations.',
          'Where personal identification is not required, the platform may aggregate certain data for analytics, performance monitoring, or service optimization.',
        ],
      },
      {
        title: '3. Sharing and Retention',
        paragraphs: [
          'Except where required by law, regulatory instructions, risk review needs, or to complete a service you initiate, the platform does not sell your personal information to unrelated third parties.',
          'Relevant data may be retained for as long as necessary to fulfill service purposes and applicable compliance obligations, and protected through reasonable security measures such as access control, audit logging, and encrypted transmission.',
        ],
      },
      {
        title: '4. Your Rights',
        paragraphs: [
          'Within the scope supported by the platform, you may review, correct, and update certain personal information, and you may request account closure or opt out of some marketing communications according to your account status.',
          'If you have questions, complaints, or deletion requests regarding privacy handling, you may contact the platform through official support channels.',
        ],
      },
    ],
  },
  aml: {
    title: 'AML Policy',
    intro: 'This AML Policy explains the basic rules PREMIER applies to customer due diligence, transaction monitoring, risk review, and suspicious-activity handling.',
    updatedAt: 'Last updated: 2026-06-10',
    sections: [
      {
        title: '1. Customer Due Diligence',
        paragraphs: [
          'To fulfill anti-money laundering, counter-terrorist financing, and sanctions-screening obligations, the platform may require identity documents, source-of-funds explanations, or other supporting materials based on account risk level.',
          'If you refuse to cooperate, submit clearly inaccurate information, or fail verification, the platform may restrict registration, login, trading, deposits, withdrawals, or other related services.',
        ],
      },
      {
        title: '2. Monitoring and Risk Review',
        paragraphs: [
          'The platform may continuously monitor accounts and orders based on transaction size, frequency, devices, address linkages, on-chain paths, abnormal patterns, and other risk indicators.',
          'Where suspicious features are identified, such as split transactions, abusive arbitrage, frequent transfers, or interaction with high-risk addresses, the platform may request additional explanations and conduct manual review.',
        ],
      },
      {
        title: '3. Restrictions and Reporting',
        paragraphs: [
          'If the platform reasonably suspects that an account, device, wallet address, order, or fund flow is related to money laundering, fraud, sanctions evasion, or other unlawful activity, it may immediately suspend services or freeze certain functions.',
          'Where necessary, the platform may file suspicious-activity reports, cooperate with competent authorities, and retain relevant evidence in accordance with applicable laws and regulations.',
        ],
      },
      {
        title: '4. User Commitments',
        paragraphs: [
          'You represent that the funds, accounts, and wallets used on the platform are from lawful sources and will not be used to evade regulation, disguise ownership, or facilitate other unlawful conduct.',
          'Your continued use of the platform constitutes your understanding of and consent to the platform taking reasonable compliance, review, restriction, and reporting measures when required.',
        ],
      },
    ],
  },
};

export function getLegalPath(key: LegalDocumentKey) {
  return `/legal/${key}`;
}

export function getLegalDocumentKey(value: string | undefined): LegalDocumentKey | null {
  if (value === 'terms' || value === 'privacy' || value === 'aml') return value;
  return null;
}

export function formatLegalLabel(label: string, language: string) {
  return isChineseLanguage(language) ? `《${label}》` : label;
}

export function getAgreementCopy(language: string): AgreementCopy {
  const lower = (language ?? '').toLowerCase();
  if (lower.startsWith('zh-cn')) {
    return {
      prefix: '请确保您的账号安全，当您点击确认并登录时，即表示您同意使用我们的',
      afterPrefix: '',
      betweenTermsAndPrivacy: '',
      betweenPrivacyAndAml: ' 和 ',
      suffix: '',
    };
  }

  if (lower.startsWith('zh')) {
    return {
      prefix: '請確保您的帳號安全，當您點擊確認並登入時，即表示您同意使用我們的',
      afterPrefix: '',
      betweenTermsAndPrivacy: '',
      betweenPrivacyAndAml: ' 和 ',
      suffix: '',
    };
  }

  if (lower.startsWith('ja')) {
    return {
      prefix: 'アカウントの安全を確保してください。確認してログインすると、当社の',
      afterPrefix: ' ',
      betweenTermsAndPrivacy: '、',
      betweenPrivacyAndAml: '、および ',
      suffix: ' に同意したことになります。',
    };
  }

  if (lower.startsWith('ko')) {
    return {
      prefix: '계정 보안을 확인하세요. 확인 및 로그인 시 당사의 ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' 및 ',
      suffix: '에 동의하는 것으로 간주됩니다.',
    };
  }

  if (lower.startsWith('de')) {
    return {
      prefix: 'Bitte schützen Sie Ihr Konto. Durch Klicken auf Bestätigen und Anmelden stimmen Sie unseren ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' und ',
      suffix: ' zu.',
    };
  }

  if (lower.startsWith('ru')) {
    return {
      prefix: 'Обеспечьте безопасность своего аккаунта. Нажимая подтвердить и войти, вы соглашаетесь с нашими ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' и ',
      suffix: '.',
    };
  }

  if (lower.startsWith('es')) {
    return {
      prefix: 'Proteja su cuenta. Al hacer clic en confirmar e iniciar sesión, acepta nuestros ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' y ',
      suffix: '.',
    };
  }

  if (lower.startsWith('fr')) {
    return {
      prefix: 'Veuillez sécuriser votre compte. En confirmant et vous connectant, vous acceptez nos ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' et ',
      suffix: '.',
    };
  }

  if (lower.startsWith('pt')) {
    return {
      prefix: 'Mantenha sua conta segura. Ao clicar em confirmar e entrar, você concorda com nossos ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' e ',
      suffix: '.',
    };
  }

  if (lower.startsWith('tr')) {
    return {
      prefix: 'Hesabınızın güvenliğini sağlayın. Onaylayıp giriş yaparak ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' ve ',
      suffix: ' kabul etmiş olursunuz.',
    };
  }

  if (lower.startsWith('vi')) {
    return {
      prefix: 'Vui lòng bảo vệ tài khoản của bạn. Bằng cách xác nhận và đăng nhập, bạn đồng ý với ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' và ',
      suffix: ' của chúng tôi.',
    };
  }

  if (lower.startsWith('th')) {
    return {
      prefix: 'โปรดรักษาความปลอดภัยบัญชีของคุณ การคลิกยืนยันและเข้าสู่ระบบแสดงว่าคุณยอมรับ ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' และ ',
      suffix: ' ของเรา',
    };
  }

  if (lower.startsWith('id')) {
    return {
      prefix: 'Harap jaga keamanan akun Anda. Dengan mengonfirmasi dan masuk, Anda menyetujui ',
      afterPrefix: '',
      betweenTermsAndPrivacy: ', ',
      betweenPrivacyAndAml: ' dan ',
      suffix: ' kami.',
    };
  }

  if (lower.startsWith('ar')) {
    return {
      prefix: 'يرجى الحفاظ على أمان حسابك. بالنقر فوق تأكيد وتسجيل الدخول، فإنك توافق على ',
      afterPrefix: '',
      betweenTermsAndPrivacy: '، و',
      betweenPrivacyAndAml: ' و',
      suffix: ' الخاصة بنا.',
    };
  }

  return {
    prefix: 'Please keep your account safe. By clicking confirm and login, you agree to our',
    afterPrefix: ' ',
    betweenTermsAndPrivacy: ', ',
    betweenPrivacyAndAml: ' and ',
    suffix: '.',
  };
}

export function getLegalDocument(language: string, key: LegalDocumentKey): LegalDocument {
  const normalized = normalizeLegalLanguage(language);
  if (normalized === 'zh-CN') return zhCNDocuments[key];
  if (normalized === 'zh-TW') return zhTWDocuments[key];
  return enDocuments[key];
}

function normalizeLegalLanguage(language: string) {
  const lower = language.toLowerCase();
  if (lower.startsWith('zh-cn')) return 'zh-CN';
  if (lower.startsWith('zh')) return 'zh-TW';
  return 'en';
}

function isChineseLanguage(language: string) {
  return language.toLowerCase().startsWith('zh');
}
