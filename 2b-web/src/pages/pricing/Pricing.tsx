import { useState, useEffect } from 'react';
import { Card, Input, Spin, Empty, Row, Col, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import ModelCard from '../../components/pricing/ModelCard';
import request from '../../utils/request';
import './pricing.css';

const { Search } = Input;

interface Model {
  id: number;
  model_name: string;
  name?: string;
  input?: number;
  output?: number;
  vendor_name?: string;
  vendor_icon?: string;
  description?: string;
  quota_type?: number;
  is_listed?: boolean;
  [key: string]: any;
}

const Pricing = () => {
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<Model[]>([]);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelsDevData, setModelsDevData] = useState<any>(null);

  // 加载价格数据
  const loadPricing = async () => {
    setLoading(true);
    try {
      const res: any = await request.get('/api/pricing');
      if (res.success && res.data) {
        const modelsData = res.data;
        const vendors = res.vendors || [];

        // 构建供应商 Map
        const vendorMap: Record<number, any> = {};
        vendors.forEach((v: any) => {
          vendorMap[v.id] = v;
        });

        // 格式化模型数据
        const formattedModels = modelsData
          .map((m: any) => {
            const model = { ...m };
            if (model.vendor_id && vendorMap[model.vendor_id]) {
              const vendor = vendorMap[model.vendor_id];
              model.vendor_name = vendor.name;
              model.vendor_icon = vendor.icon;
            }

            // 计算价格（简化版本，不考虑groupRatio）
            if (model.quota_type === 0) {
              // 按量计费
              model.input = model.model_ratio ? model.model_ratio * 2 : 0;
              model.output = model.model_ratio && model.completion_ratio
                ? model.model_ratio * model.completion_ratio * 2
                : model.input;
            } else if (model.quota_type === 1) {
              // 按次计费
              model.output = model.model_price || 0;
            }

            return model;
          })
          .filter((model: Model) => model.is_listed !== false);

        setModels(formattedModels);
        setFilteredModels(formattedModels);
      } else {
        message.error('加载价格数据失败');
      }
    } catch (error) {
      message.error('加载价格数据失败');
      console.error('Failed to load pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  // 加载 models.dev 数据（可选）
  const loadModelsDevData = async () => {
    try {
      const res = await request.get('/api/models/dev');
      if (res.success && res.data) {
        setModelsDevData(res.data);
      }
    } catch (error) {
      console.error('Failed to load models.dev data:', error);
    }
  };

  useEffect(() => {
    loadPricing();
    loadModelsDevData();
  }, []);

  // 搜索过滤
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setFilteredModels(models);
      return;
    }

    const query = value.toLowerCase();
    const filtered = models.filter((model) => {
      const name = model.model_name || model.name || '';
      const provider = model.vendor_name || '';
      const description = model.description || '';

      return (
        name.toLowerCase().includes(query) ||
        provider.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query)
      );
    });

    setFilteredModels(filtered);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="模型定价"
        extra={
          <Search
            placeholder="搜索模型名称或提供商"
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: 300 }}
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
          />
        }
      >
        <Spin spinning={loading}>
          {filteredModels.length === 0 && !loading ? (
            <Empty description="暂无模型数据" />
          ) : (
            <Row gutter={[16, 16]}>
              {filteredModels.map((model) => (
                <Col key={model.id} xs={24} sm={12} md={8} lg={6} xl={6}>
                  <ModelCard
                    model={model}
                    name={model.model_name || model.name || ''}
                    input={model.input}
                    output={model.output}
                    vendorName={model.vendor_name}
                    description={model.description}
                    quotaType={model.quota_type}
                    modelsDevData={modelsDevData}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default Pricing;
