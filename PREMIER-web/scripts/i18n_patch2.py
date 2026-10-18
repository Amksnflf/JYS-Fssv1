#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Insert 3 more keys: common.requestFailed, trade.enterField, market.inAppSummary."""
import os

LOCALES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'i18n', 'locales')

# lang -> (requestFailed, enterField, inAppSummary)
V = {
    'ar': ('فشل الطلب', 'يرجى إدخال {{field}}', 'ملخص داخل التطبيق'),
    'de': ('Anfrage fehlgeschlagen', 'Bitte {{field}} eingeben', 'In-App-Zusammenfassung'),
    'es': ('Solicitud fallida', 'Introduce {{field}}', 'Resumen en la app'),
    'fr': ('Échec de la requête', 'Veuillez saisir {{field}}', "Résumé dans l'app"),
    'id': ('Permintaan gagal', 'Silakan masukkan {{field}}', 'Ringkasan dalam aplikasi'),
    'ja': ('リクエストに失敗しました', '{{field}}を入力してください', 'アプリ内要約'),
    'ko': ('요청 실패', '{{field}}을(를) 입력하세요', '앱 내 요약'),
    'pt-BR': ('Falha na solicitação', 'Insira {{field}}', 'Resumo no app'),
    'ru': ('Ошибка запроса', 'Введите {{field}}', 'Сводка в приложении'),
    'th': ('คำขอล้มเหลว', 'โปรดกรอก {{field}}', 'สรุปในแอป'),
    'tr': ('İstek başarısız', 'Lütfen {{field}} girin', 'Uygulama içi özet'),
    'vi': ('Yêu cầu thất bại', 'Vui lòng nhập {{field}}', 'Tóm tắt trong ứng dụng'),
    'zh-CN': ('请求失败', '请输入{{field}}', '站内摘要'),
}


def esc(v):
    return v.replace("'", "\\'")


def patch(lang):
    rf, ef, ias = V[lang]
    path = os.path.join(LOCALES_DIR, lang + '.ts')
    with open(path, encoding='utf-8') as f:
        src = f.read()
    # common.requestFailed after `all: '...',`
    src = src.replace("    all: '", "    requestFailed: '%s',\n    all: '" % esc(rf), 1) \
        if False else src
    # simpler: insert after the `all:` line's value; find first `    all: '...',\n`
    import re
    src = re.sub(r"(\n    all: '[^']*',)",
                 lambda m: m.group(1) + "\n    requestFailed: '%s'," % esc(rf), src, count=1)
    src = re.sub(r"(\n    symbol: '[^']*',)",
                 lambda m: m.group(1) + "\n    enterField: '%s'," % esc(ef), src, count=1)
    src = re.sub(r"(\n    dynamicTitle: '[^']*',)",
                 lambda m: m.group(1) + "\n    inAppSummary: '%s'," % esc(ias), src, count=1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(src)
    print('patched', lang)


if __name__ == '__main__':
    for lang in V:
        patch(lang)
