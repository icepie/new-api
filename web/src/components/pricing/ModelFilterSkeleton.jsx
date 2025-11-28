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
import { Skeleton } from '@douyinfe/semi-ui';

const ModelFilterSkeleton = () => {
  return (
    <aside className="pricing-filter-sidebar">
      <div className="pricing-filter-container">
        {/* Header Skeleton */}
        <div className="pricing-filter-header">
          <div className="pricing-filter-header-top">
            <div className="pricing-filter-header-content">
              <Skeleton.Title
                style={{
                  width: 100,
                  height: 18,
                  marginBottom: 0,
                }}
              />
            </div>
            <Skeleton.Button
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
              }}
            />
          </div>
        </div>

        {/* Type Section Skeleton */}
        <div className="pricing-filter-section">
          <div className="pricing-filter-section-header">
            <Skeleton.Title
              style={{
                width: 60,
                height: 16,
                marginBottom: 0,
              }}
            />
            <Skeleton.Button
              style={{
                width: 16,
                height: 16,
                borderRadius: 2,
              }}
            />
          </div>
          <div className="pricing-filter-options">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton.Button
                key={index}
                style={{
                  width: `${70 + (index % 3) * 15}px`,
                  height: 32,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Tags Section Skeleton */}
        <div className="pricing-filter-section">
          <div className="pricing-filter-section-header">
            <Skeleton.Title
              style={{
                width: 50,
                height: 16,
                marginBottom: 0,
              }}
            />
            <Skeleton.Button
              style={{
                width: 16,
                height: 16,
                borderRadius: 2,
              }}
            />
          </div>
          <div className="pricing-filter-options pricing-filter-options-two-columns">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton.Button
                key={index}
                style={{
                  width: '100%',
                  height: 32,
                  borderRadius: 6,
                }}
              />
            ))}
          </div>
        </div>

        {/* Providers Section Skeleton */}
        <div className="pricing-filter-section">
          <div className="pricing-filter-section-header">
            <Skeleton.Title
              style={{
                width: 70,
                height: 16,
                marginBottom: 0,
              }}
            />
            <Skeleton.Button
              style={{
                width: 16,
                height: 16,
                borderRadius: 2,
              }}
            />
          </div>
          <div className="pricing-filter-options pricing-filter-options-single-column">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Skeleton.Avatar
                  size="small"
                  style={{ width: 14, height: 14, borderRadius: 3 }}
                />
                <Skeleton.Title
                  style={{
                    width: `${80 + (index % 3) * 20}px`,
                    height: 16,
                    marginBottom: 0,
                    flex: 1,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ModelFilterSkeleton;

