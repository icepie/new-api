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

import { useState, useEffect, useRef } from 'react';
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
} from '@lobehub/icons';

const models = [
  { name: 'OpenAI', icon: OpenAI, colorIcon: OpenAI.Color },
  { name: 'Anthropic', icon: Anthropic, colorIcon: Anthropic.Color },
  { name: 'Google', icon: Google, colorIcon: Google.Color },
  { name: 'Gemini', icon: Gemini, colorIcon: Gemini.Color },
  { name: 'Claude', icon: Claude, colorIcon: Claude.Color },
  { name: 'Mistral', icon: Mistral, colorIcon: Mistral.Color },
  { name: 'DeepSeek', icon: DeepSeek, colorIcon: DeepSeek.Color },
  { name: 'Qwen', icon: Qwen, colorIcon: Qwen.Color },
  { name: 'Moonshot', icon: Moonshot, colorIcon: Moonshot.Color },
  { name: 'Zhipu', icon: Zhipu, colorIcon: Zhipu.Color },
  { name: 'Baichuan', icon: Baichuan, colorIcon: Baichuan.Color },
  { name: 'Doubao', icon: Doubao, colorIcon: Doubao.Color },
  { name: 'Spark', icon: Spark, colorIcon: Spark.Color },
  { name: 'Groq', icon: Groq, colorIcon: Groq.Color },
  { name: 'Perplexity', icon: Perplexity, colorIcon: Perplexity.Color },
  { name: 'Cohere', icon: Cohere, colorIcon: Cohere.Color },
  { name: 'Together', icon: Together, colorIcon: Together.Color },
  { name: '360 AI', icon: Ai360, colorIcon: Ai360.Color },
].filter((model) => model && model.icon);

export default function ModelShowcase() {
  const [visibleItems, setVisibleItems] = useState(new Set());
  const containerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 逐个显示图标
            models.forEach((_, index) => {
              setTimeout(() => {
                setVisibleItems((prev) => new Set(prev).add(index));
              }, index * 30);
            });
          } else {
            // 离开视口时重置，以便下次进入时重新播放动画
            setVisibleItems(new Set());
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  return (
    <div className="model-showcase-container" ref={containerRef}>
      <div className="model-showcase-grid">
        {models.map((model, index) => {
          const IconComponent = model.colorIcon || model.icon;
          const isItemVisible = visibleItems.has(index);
          const isLast = index === models.length - 1;
          return (
            <div
              key={index}
              className={`model-icon-card model-icon-fade-in ${
                isItemVisible ? 'model-icon-visible' : 'model-icon-hidden'
              }`}
              style={{
                transitionDelay: `${index * 30}ms`,
              }}
            >
              {isLast ? (
                <div className="model-icon-wrapper">
                  <span className="model-icon-count">
                    30+
                  </span>
                </div>
              ) : (
                <>
                  <div className="model-icon-wrapper">
                    {model.colorIcon ? (
                      <IconComponent size={32} />
                    ) : (
                      <IconComponent
                        size={32}
                        className="model-icon-svg"
                      />
                    )}
                  </div>
                  <span className="model-icon-name">
                    {model.name}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

