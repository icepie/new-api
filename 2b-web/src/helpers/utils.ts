// 价格计算工具函数

interface CalculateModelPriceParams {
  record: any;
  selectedGroup?: string;
  groupRatio?: Record<string, number>;
  tokenUnit?: 'K' | 'M';
  displayPrice?: (price: number) => string;
  currency?: 'USD' | 'CNY' | 'CUSTOM';
  precision?: number;
}

export const calculateModelPrice = ({
  record,
  selectedGroup = 'default',
  groupRatio = {},
  tokenUnit = 'M',
  displayPrice = (price: number) => `$${price.toFixed(4)}`,
  currency = 'USD',
  precision = 4,
}: CalculateModelPriceParams) => {
  // 1. 选择实际使用的分组
  let usedGroup = selectedGroup;
  let usedGroupRatio = groupRatio[selectedGroup];

  if (selectedGroup === 'all' || usedGroupRatio === undefined) {
    // 在模型可用分组中选择倍率最小的分组，若无则使用 1
    let minRatio = Number.POSITIVE_INFINITY;
    if (
      Array.isArray(record.enable_groups) &&
      record.enable_groups.length > 0
    ) {
      record.enable_groups.forEach((g: string) => {
        const r = groupRatio[g];
        if (r !== undefined && r < minRatio) {
          minRatio = r;
          usedGroup = g;
          usedGroupRatio = r;
        }
      });
    }

    // 如果找不到合适分组倍率，回退为 1
    if (usedGroupRatio === undefined) {
      usedGroupRatio = 1;
    }
  }

  // 2. 根据计费类型计算价格
  if (record.quota_type === 0) {
    // 按量计费
    const inputRatioPriceUSD = record.model_ratio * 2 * usedGroupRatio;
    const completionRatioPriceUSD =
      record.model_ratio * record.completion_ratio * 2 * usedGroupRatio;

    const unitDivisor = tokenUnit === 'K' ? 1000 : 1;
    const unitLabel = tokenUnit === 'K' ? 'K' : 'M';

    const rawDisplayInput = displayPrice(inputRatioPriceUSD);
    const rawDisplayCompletion = displayPrice(completionRatioPriceUSD);

    const numInput =
      parseFloat(rawDisplayInput.replace(/[^0-9.]/g, '')) / unitDivisor;
    const numCompletion =
      parseFloat(rawDisplayCompletion.replace(/[^0-9.]/g, '')) / unitDivisor;

    let symbol = '$';
    if (currency === 'CNY') {
      symbol = '¥';
    } else if (currency === 'CUSTOM') {
      try {
        const statusStr = localStorage.getItem('status');
        if (statusStr) {
          const s = JSON.parse(statusStr);
          symbol = s?.custom_currency_symbol || '¤';
        } else {
          symbol = '¤';
        }
      } catch (e) {
        symbol = '¤';
      }
    }
    return {
      inputPrice: `${symbol}${numInput.toFixed(precision)}`,
      completionPrice: `${symbol}${numCompletion.toFixed(precision)}`,
      unitLabel,
      isPerToken: true,
      usedGroup,
      usedGroupRatio,
    };
  }

  if (record.quota_type === 1) {
    // 按次计费
    const priceUSD = parseFloat(record.model_price) * usedGroupRatio;
    const displayVal = displayPrice(priceUSD);

    return {
      price: displayVal,
      isPerToken: false,
      usedGroup,
      usedGroupRatio,
    };
  }

  // 未知计费类型，返回占位信息
  return {
    price: '-',
    isPerToken: false,
    usedGroup,
    usedGroupRatio,
  };
};
