import React from 'react';
import { WIDGET_REGISTRY } from '../registry/widget-registry';
import { WidgetSize } from '../types';

// col-span classes: single col on mobile, 2-col grid on md, 4-col on lg
const SIZE_CLASSES: Record<WidgetSize, string> = {
  small:  'col-span-1',
  medium: 'col-span-1 md:col-span-1 lg:col-span-2',
  large:  'col-span-1 md:col-span-2 lg:col-span-3',
  full:   'col-span-1 md:col-span-2 lg:col-span-4',
};

export function DashboardGrid() {
  const sortedWidgets = [...WIDGET_REGISTRY].sort((a, b) => a.order - b.order);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {sortedWidgets.map((widget) => {
        const Component = widget.component;
        const spanClass = SIZE_CLASSES[widget.size] || SIZE_CLASSES.medium;

        return (
          <div key={widget.id} className={spanClass}>
            <Component />
          </div>
        );
      })}
    </div>
  );
}
