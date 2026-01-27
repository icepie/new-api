/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React from 'react';
import * as LobeIcons from '@lobehub/icons';
import {
  OpenAI,
  Anthropic,
  Google,
  Mistral,
  DeepSeek,
  Qwen,
  Moonshot,
  Zhipu,
  Baichuan,
  Doubao,
  Spark,
  Gemini,
  Claude,
  Groq,
  Perplexity,
  Cohere,
  Together,
  Ai360,
  Baidu,
  BaiduCloud,
  ByteDance,
  ChatGLM,
  GLMV,
  InternLM,
  Minimax,
  Stepfun,
  Tencent,
  TencentCloud,
  ZAI,
  XAI,
  Ollama,
  Yi,
  Jina,
  Hunyuan,
  Kling,
  Jimeng,
  Vidu,
  Midjourney,
} from '@lobehub/icons';

interface ProviderIconProps {
  provider: string;
  iconName?: string;
  size?: number;
  className?: string;
}

export default function ProviderIcon({ provider, iconName, size = 28, className = '' }: ProviderIconProps) {
  // 如果提供了 iconName（来自 API），优先使用动态加载
  if (iconName) {
    const segments = String(iconName).trim().split('.');
    const baseKey = segments[0];
    const BaseIcon = (LobeIcons as any)[baseKey];

    if (BaseIcon) {
      let IconComponent = undefined;

      // 支持 "OpenAI.Color" 格式
      if (segments.length > 1 && BaseIcon[segments[1]]) {
        IconComponent = BaseIcon[segments[1]];
      } else {
        IconComponent = BaseIcon;
      }

      if (IconComponent && (typeof IconComponent === 'function' || typeof IconComponent === 'object')) {
        return (
          <div className={`pricing-provider-icon ${className}`} style={{ width: size, height: size }}>
            <IconComponent size={size} />
          </div>
        );
      }
    }
  }

  // 回退到提供商名称映射（兼容旧逻辑）
  const iconMap: Record<string, any> = {
    // 基础供应商
    'OpenAI': (OpenAI as any)?.Color || OpenAI,
    'Anthropic': (Anthropic as any)?.Color || Anthropic,
    'Google': (Google as any)?.Color || Google,
    'Gemini': (Gemini as any)?.Color || Gemini,
    'Claude': (Claude as any)?.Color || Claude,
    'Mistral': (Mistral as any)?.Color || Mistral,
    'DeepSeek': (DeepSeek as any)?.Color || DeepSeek,
    'Qwen': (Qwen as any)?.Color || Qwen,
    'Kimi': (Moonshot as any)?.Color || Moonshot,
    'Moonshot': (Moonshot as any)?.Color || Moonshot,
    '蚂蚁百灵': (Baichuan as any)?.Color || Baichuan,
    'Baichuan': (Baichuan as any)?.Color || Baichuan,
    'Doubao': (Doubao as any)?.Color || Doubao,
    'Spark': (Spark as any)?.Color || Spark,
    'Zhipu': (Zhipu as any)?.Color || Zhipu,
    'Groq': (Groq as any)?.Color || Groq,
    'Perplexity': (Perplexity as any)?.Color || Perplexity,
    'Cohere': (Cohere as any)?.Color || Cohere,
    'Together': (Together as any)?.Color || Together,
    '360 AI': (Ai360 as any)?.Color || Ai360,
    'Ai360': (Ai360 as any)?.Color || Ai360,
    'Baidu': (Baidu as any)?.Color || Baidu,
    'BaiduCloud': (BaiduCloud as any)?.Color || BaiduCloud,
    'ByteDance': (ByteDance as any)?.Color || ByteDance,
    'THUDM': (ChatGLM as any)?.Color || ChatGLM,
    'ChatGLM': (ChatGLM as any)?.Color || ChatGLM,
    'GLMV': (GLMV as any)?.Color || GLMV,
    'InternLM': (InternLM as any)?.Color || InternLM,
    'MiniMax': (Minimax as any)?.Color || Minimax,
    'Minimax': (Minimax as any)?.Color || Minimax,
    'StepFun': (Stepfun as any)?.Color || Stepfun,
    'Stepfun': (Stepfun as any)?.Color || Stepfun,
    'Tencent': (Tencent as any)?.Color || Tencent,
    'TencentCloud': (TencentCloud as any)?.Color || TencentCloud,
    'ZAI': (ZAI as any)?.Color || ZAI,
    // 新增供应商图标
    'Vidu': Vidu || (LobeIcons as any).Vidu,
    'xAI': XAI || (LobeIcons as any).XAI,
    'Meta': Ollama || (LobeIcons as any).Ollama,
    'Jina': Jina || (LobeIcons as any).Jina,
    '即梦': (Jimeng as any)?.Color || Jimeng,
    'Jimeng': (Jimeng as any)?.Color || Jimeng,
    '零一万物': (Yi as any)?.Color || Yi,
    'Yi': (Yi as any)?.Color || Yi,
    '快手': (Kling as any)?.Color || Kling,
    'Kling': (Kling as any)?.Color || Kling,
    '字节跳动': (Doubao as any)?.Color || Doubao,
    '腾讯': (Hunyuan as any)?.Color || Hunyuan,
    'Hunyuan': (Hunyuan as any)?.Color || Hunyuan,
    '阿里巴巴': (Qwen as any)?.Color || Qwen,
    '智谱': (Zhipu as any)?.Color || Zhipu,
    // 其他供应商
    'Microsoft': (LobeIcons as any).AzureAI || null,
    'Azure': (LobeIcons as any).AzureAI || null,
    'Stability AI': null,
    'Ideogram': (LobeIcons as any).Ideogram || null,
    'Runway': (LobeIcons as any).Runway || null,
    'Suno': (LobeIcons as any).Suno || null,
    'Alibaba Cloud': (Qwen as any)?.Color || Qwen,
    'Higgsfield': null,
    'Kolors': (LobeIcons as any).Kolors || null,
    'Docmee': null,
    'Fal AI': null,
    'Midjourney': Midjourney || (LobeIcons as any).Midjourney,
  };

  const IconComponent = iconMap[provider];

  if (!IconComponent) {
    // 如果没有找到图标，返回默认的字母图标
    const firstLetter = provider.charAt(0).toUpperCase();
    return (
      <div className={`pricing-provider-icon-default ${className}`} style={{ width: size, height: size }}>
        {firstLetter}
      </div>
    );
  }

  return (
    <div className={`pricing-provider-icon ${className}`} style={{ width: size, height: size }}>
      <IconComponent size={size} />
    </div>
  );
}
