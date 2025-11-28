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

import React, { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '../../hooks/common/useIsMobile';

const ScrollIndicator = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [sectionCount, setSectionCount] = useState(5);
  const indicatorRef = useRef(null);
  const observerRef = useRef(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const findContainer = () => {
      return document.querySelector('.snap-scroll-container');
    };

    const initObserver = () => {
      const container = findContainer();
      if (!container) {
        setTimeout(initObserver, 100);
        return;
      }

      // 查找所有 section（排除最后一个 footer）
      const sections = container.querySelectorAll('.snap-section');
      if (sections.length === 0) {
        setTimeout(initObserver, 100);
        return;
      }

      // 更新 section 数量（排除最后一个 footer）
      const displayCount = Math.max(1, sections.length - 1);
      setSectionCount(displayCount);

      // 创建 IntersectionObserver 来检测当前可见的 section
      observerRef.current = new IntersectionObserver(
        (entries) => {
          // 找到最接近视口中心的 section
          let maxIntersectionRatio = 0;
          let activeSectionIndex = 0;

          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > maxIntersectionRatio) {
              maxIntersectionRatio = entry.intersectionRatio;
              activeSectionIndex = Array.from(sections).indexOf(entry.target);
            }
          });

          // 如果没有找到，通过滚动位置计算
          if (maxIntersectionRatio === 0) {
            const scrollTop = container.scrollTop;
            const containerHeight = container.clientHeight;
            const centerY = scrollTop + containerHeight / 2;

            sections.forEach((section, index) => {
              const rect = section.getBoundingClientRect();
              const sectionTop = rect.top + scrollTop;
              const sectionHeight = rect.height;
              const sectionCenter = sectionTop + sectionHeight / 2;

              if (Math.abs(centerY - sectionCenter) < containerHeight / 2) {
                activeSectionIndex = index;
              }
            });
          }

          // 如果激活的是最后一个 section（footer），不显示高亮
          // 或者显示倒数第二个 section 的高亮
          if (activeSectionIndex >= displayCount) {
            activeSectionIndex = displayCount - 1;
          }

          setActiveIndex(activeSectionIndex);
        },
        {
          root: container,
          threshold: [0, 0.25, 0.5, 0.75, 1],
          rootMargin: '-40% 0px -40% 0px', // 只检测视口中心区域
        }
      );

      // 观察所有 section
      sections.forEach((section) => {
        observerRef.current.observe(section);
      });

      // 初始计算
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const centerY = scrollTop + containerHeight / 2;

      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const sectionTop = rect.top + scrollTop;
        const sectionHeight = rect.height;
        const sectionCenter = sectionTop + sectionHeight / 2;

        if (Math.abs(centerY - sectionCenter) < containerHeight) {
          // 如果激活的是最后一个 section（footer），显示倒数第二个
          const activeIndex = index >= displayCount ? displayCount - 1 : index;
          setActiveIndex(activeIndex);
        }
      });
    };

    initObserver();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // 计算每个点的位置
  const getDotPosition = (index, total) => {
    if (total <= 1) return 0;
    // 轨道高度 240px，点直径 8px
    // 第一个点在顶部，最后一个点在底部
    // 可用空间 = 240 - 8 = 232px
    const availableSpace = 232;
    return (index / (total - 1)) * availableSpace;
  };

  const dots = Array.from({ length: sectionCount }, (_, i) => i);

  // 在移动端或宽度不够时不显示指示器
  if (isMobile) {
    return null;
  }

  return (
    <div className="scroll-indicator" ref={indicatorRef}>
      <div className="scroll-indicator-track">
        {/* 静态的点 */}
        {dots.map((index) => {
          const dotPosition = getDotPosition(index, sectionCount);
          const isActive = index === activeIndex;
          
          return (
            <div
              key={index}
              className={`scroll-indicator-dot-wrapper ${
                isActive ? 'active' : ''
              }`}
              style={{
                top: `${dotPosition}px`,
              }}
            >
              <div className="scroll-indicator-dot" />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ScrollIndicator;

