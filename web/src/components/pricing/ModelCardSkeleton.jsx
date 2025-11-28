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

const ModelCardSkeleton = ({ count = 12 }) => {
  return (
    <div className="pricing-page-models-grid" id="models-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="pricing-page-model-card-item">
          <div className="pricing-model-card">
            {/* Status Badge Skeleton */}
            <div className="pricing-model-card-badges">
              {index % 3 === 0 && (
                <Skeleton.Button
                  style={{
                    width: 32,
                    height: 18,
                    borderRadius: 4,
                  }}
                />
              )}
            </div>

            {/* Provider Logo and Name Skeleton */}
            <div className="pricing-model-card-provider">
              <div className="pricing-model-card-provider-icon">
                <Skeleton.Avatar
                  size="default"
                  style={{ width: 28, height: 28, borderRadius: 6 }}
                />
              </div>
              <div className="pricing-model-card-provider-name">
                <Skeleton.Title
                  style={{
                    width: `${80 + (index % 4) * 20}px`,
                    height: 16,
                    marginBottom: 0,
                  }}
                />
              </div>
            </div>

            {/* Model Name Skeleton */}
            <h3 className="pricing-model-card-name">
              <Skeleton.Title
                style={{
                  width: `${140 + (index % 3) * 40}px`,
                  height: 20,
                  marginBottom: 0,
                }}
              />
            </h3>

            {/* Price Skeleton */}
            <div className="pricing-model-card-price">
              <div className="pricing-model-card-price-per-token">
                <div className="pricing-model-card-price-row">
                  <Skeleton.Title
                    style={{
                      width: 40,
                      height: 14,
                      marginBottom: 0,
                      marginRight: 8,
                    }}
                  />
                  <Skeleton.Title
                    style={{
                      width: `${100 + (index % 3) * 15}px`,
                      height: 14,
                      marginBottom: 0,
                    }}
                  />
                </div>
                <div className="pricing-model-card-price-row">
                  <Skeleton.Title
                    style={{
                      width: 40,
                      height: 14,
                      marginBottom: 0,
                      marginRight: 8,
                    }}
                  />
                  <Skeleton.Title
                    style={{
                      width: `${100 + (index % 3) * 15}px`,
                      height: 14,
                      marginBottom: 0,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Description Skeleton */}
            <p className="pricing-model-card-description">
              <Skeleton.Paragraph
                rows={2}
                style={{ marginBottom: 0 }}
                title={false}
              />
            </p>

            {/* Tags Skeleton */}
            <div className="pricing-model-card-tags">
              {Array.from({ length: 2 + (index % 3) }).map((_, tagIndex) => (
                <Skeleton.Button
                  key={tagIndex}
                  style={{
                    width: `${45 + (tagIndex % 3) * 20}px`,
                    height: 20,
                    borderRadius: 12,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ModelCardSkeleton;

