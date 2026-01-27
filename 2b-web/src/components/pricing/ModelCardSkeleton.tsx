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

interface ModelCardSkeletonProps {
  count?: number;
}

const ModelCardSkeleton = ({ count = 12 }: ModelCardSkeletonProps) => {
  return (
    <div className="pricing-page-models-grid" id="models-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="pricing-page-model-card-item">
          <div className="pricing-model-card">
            {/* Status Badge Skeleton */}
            <div className="pricing-model-card-badges">
              {index % 3 === 0 && (
                <div
                  className="skeleton-element"
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
                <div
                  className="skeleton-element"
                  style={{ width: 28, height: 28, borderRadius: 6 }}
                />
              </div>
              <div className="pricing-model-card-provider-name">
                <div
                  className="skeleton-element"
                  style={{
                    width: `${80 + (index % 4) * 20}px`,
                    height: 16,
                  }}
                />
              </div>
            </div>

            {/* Model Name Skeleton */}
            <h3 className="pricing-model-card-name">
              <div
                className="skeleton-element"
                style={{
                  width: `${140 + (index % 3) * 40}px`,
                  height: 20,
                }}
              />
            </h3>

            {/* Price Skeleton */}
            <div className="pricing-model-card-price">
              <div className="pricing-model-card-price-per-token">
                <div className="pricing-model-card-price-row">
                  <div
                    className="skeleton-element"
                    style={{
                      width: 40,
                      height: 14,
                      marginRight: 8,
                    }}
                  />
                  <div
                    className="skeleton-element"
                    style={{
                      width: `${100 + (index % 3) * 15}px`,
                      height: 14,
                    }}
                  />
                </div>
                <div className="pricing-model-card-price-row">
                  <div
                    className="skeleton-element"
                    style={{
                      width: 40,
                      height: 14,
                      marginRight: 8,
                    }}
                  />
                  <div
                    className="skeleton-element"
                    style={{
                      width: `${100 + (index % 3) * 15}px`,
                      height: 14,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Description Skeleton */}
            <div className="pricing-model-card-description">
              <div className="skeleton-element" style={{ height: 14, marginBottom: 8 }} />
              <div className="skeleton-element" style={{ height: 14, width: '80%' }} />
            </div>

            {/* Tags Skeleton */}
            <div className="pricing-model-card-tags">
              {Array.from({ length: 2 + (index % 3) }).map((_, tagIndex) => (
                <div
                  key={tagIndex}
                  className="skeleton-element"
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
