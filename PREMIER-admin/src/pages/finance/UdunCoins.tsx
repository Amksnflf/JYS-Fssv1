import { Alert, Card, Space, Tag, Typography } from 'antd';
import AdminDataPage from '@/components/AdminDataPage';

const { Text } = Typography;

export default function UdunCoins() {
  return (
    <AdminDataPage<any>
      title="优盾币种映射"
      description="把平台里的币种/链，映射到优盾接口返回的主币种编号、子币种编号和精度。只有配置了映射并启用后，该币种链才能生成优盾充值地址。"
      url="/admin/asset/udun-coin/page"
      saveUrl="/admin/asset/udun-coin/save"
      exportable
      beforeTable={
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Alert
              type="info"
              showIcon
              message="这个页面怎么用"
              description="先在“优盾接口配置”里填好商户信息，再根据优盾后台或 /mch/support-coins 接口拿到支持币种列表，把平台币种和链配置到这里。最后去“充值通道配置”把对应币种链开启为优盾充值或两者都开。"
            />
            <div>
              <Text strong>字段说明：</Text>
              <div style={{ marginTop: 8, lineHeight: 1.9 }}>
                <div><Text code>平台币种</Text>：用户端展示的币种，例如 USDT、ETH、BTC。</div>
                <div><Text code>平台链</Text>：用户端充值页使用的链名，例如 TRC20、ERC20、BTC，必须和系统币种/充值地址里的链名一致。</div>
                <div><Text code>优盾主币种编号</Text>：优盾的 mainCoinType，通常代表主链，例如 ETH 主链、BTC 主链、TRON 主链。</div>
                <div><Text code>优盾子币种编号</Text>：优盾的 coinType，代表实际到账资产。主币时通常和主币种编号一致，代币时用优盾返回的代币编号。</div>
                <div><Text code>精度</Text>：优盾回调金额换算用。回调 amount 是整数，实际到账 = amount / 10^精度。</div>
              </div>
            </div>
            <Alert
              type="warning"
              showIcon
              message="注意"
              description="不要凭经验乱填编号。USDT-TRC20、USDT-ERC20 这类同名币在不同链上的 mainCoinType/coinType 可能不同，必须以优盾商户支持币种接口或优盾后台显示为准。"
            />
          </Space>
        </Card>
      }
      filters={[
        { name: 'coin', label: '平台币种' },
        { name: 'chain', label: '平台链' },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      editFields={[
        { name: 'coin', label: '平台币种（如 USDT）', required: true },
        { name: 'chain', label: '平台链名（如 TRC20/ERC20）', required: true },
        { name: 'mainCoinType', label: '优盾 mainCoinType 主币种编号', required: true },
        { name: 'coinType', label: '优盾 coinType 子币种编号', required: true },
        { name: 'decimals', label: '优盾 decimals 精度', required: true },
        { name: 'enabled', label: '状态', type: 'select', options: [{ value: 1, label: '启用' }, { value: 0, label: '停用' }] },
      ]}
      initialValues={{ decimals: 8, enabled: 1 }}
      columns={[
        { title: 'ID', dataIndex: 'id', width: 80 },
        { title: '平台币种', dataIndex: 'coin', width: 110 },
        { title: '平台链', dataIndex: 'chain', width: 120 },
        { title: '优盾 mainCoinType', dataIndex: 'mainCoinType', width: 150 },
        { title: '优盾 coinType', dataIndex: 'coinType', width: 130 },
        { title: 'decimals', dataIndex: 'decimals', width: 90 },
        { title: '状态', dataIndex: 'enabled', width: 90, render: (v) => v === 1 ? <Tag color="green">启用</Tag> : <Tag>停用</Tag> },
        { title: '更新时间', dataIndex: 'updatedAt', width: 180 },
      ]}
    />
  );
}
