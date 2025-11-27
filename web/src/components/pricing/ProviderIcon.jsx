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

export default function ProviderIcon({ provider, iconName, size = 28, className = '' }) {
  // 如果提供了 iconName（来自 API），优先使用动态加载
  if (iconName) {
    const segments = String(iconName).trim().split('.');
    const baseKey = segments[0];
    const BaseIcon = LobeIcons[baseKey];

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
  const iconMap = {
    // 基础供应商
    'OpenAI': (OpenAI?.Color || OpenAI),
    'Anthropic': (Anthropic?.Color || Anthropic),
    'Google': (Google?.Color || Google),
    'Gemini': (Gemini?.Color || Gemini),
    'Claude': (Claude?.Color || Claude),
    'Mistral': (Mistral?.Color || Mistral),
    'DeepSeek': (DeepSeek?.Color || DeepSeek),
    'Qwen': (Qwen?.Color || Qwen),
    'Kimi': (Moonshot?.Color || Moonshot),
    'Moonshot': (Moonshot?.Color || Moonshot),
    '蚂蚁百灵': (Baichuan?.Color || Baichuan),
    'Baichuan': (Baichuan?.Color || Baichuan),
    'Doubao': (Doubao?.Color || Doubao),
    'Spark': (Spark?.Color || Spark),
    'Zhipu': (Zhipu?.Color || Zhipu),
    'Groq': (Groq?.Color || Groq),
    'Perplexity': (Perplexity?.Color || Perplexity),
    'Cohere': (Cohere?.Color || Cohere),
    'Together': (Together?.Color || Together),
    '360 AI': (Ai360?.Color || Ai360),
    'Ai360': (Ai360?.Color || Ai360),
    'Baidu': (Baidu?.Color || Baidu),
    'BaiduCloud': (BaiduCloud?.Color || BaiduCloud),
    'ByteDance': (ByteDance?.Color || ByteDance),
    'THUDM': (ChatGLM?.Color || ChatGLM),
    'ChatGLM': (ChatGLM?.Color || ChatGLM),
    'GLMV': (GLMV?.Color || GLMV),
    'InternLM': (InternLM?.Color || InternLM),
    'MiniMax': (Minimax?.Color || Minimax),
    'Minimax': (Minimax?.Color || Minimax),
    'StepFun': (Stepfun?.Color || Stepfun),
    'Stepfun': (Stepfun?.Color || Stepfun),
    'Tencent': (Tencent?.Color || Tencent),
    'TencentCloud': (TencentCloud?.Color || TencentCloud),
    'ZAI': (ZAI?.Color || ZAI),
    // 新增供应商图标
    'Vidu': Vidu || LobeIcons.Vidu,
    'xAI': XAI || LobeIcons.XAI,
    'Meta': Ollama || LobeIcons.Ollama,
    'Jina': Jina || LobeIcons.Jina,
    '即梦': (Jimeng?.Color || Jimeng),
    'Jimeng': (Jimeng?.Color || Jimeng),
    '零一万物': (Yi?.Color || Yi),
    'Yi': (Yi?.Color || Yi),
    '快手': (Kling?.Color || Kling),
    'Kling': (Kling?.Color || Kling),
    '字节跳动': (Doubao?.Color || Doubao),
    '腾讯': (Hunyuan?.Color || Hunyuan),
    'Hunyuan': (Hunyuan?.Color || Hunyuan),
    '阿里巴巴': (Qwen?.Color || Qwen),
    '智谱': (Zhipu?.Color || Zhipu),
    // 其他供应商
    'Microsoft': LobeIcons.AzureAI || null,
    'Azure': LobeIcons.AzureAI || null,
    'Stability AI': LobeIcons.StabilityAI || null,
    'Ideogram': LobeIcons.Ideogram || null,
    'Runway': LobeIcons.Runway || null,
    'Suno': LobeIcons.Suno || null,
    'Alibaba Cloud': (Qwen?.Color || Qwen),
    'Higgsfield': LobeIcons.Higgsfield || null,
    'Kolors': LobeIcons.Kolors || null,
    'Docmee': LobeIcons.Docmee || null,
    'Fal AI': LobeIcons.FalAI || null,
    'Midjourney': Midjourney || LobeIcons.Midjourney,
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

