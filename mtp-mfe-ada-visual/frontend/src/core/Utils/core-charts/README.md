# CoreChart Component

The CoreChart component is a lightweight wrapper around the Highcharts React Official component. It simplifies chart integration by directly passing any options to the Highcharts library without additional processing or conversion.

## Basic Usage

```jsx
import CoreChart from 'core/Utils/core-charts';

// Define your chart options
const chartOptions = {
  chart: {
    type: 'bar'
  },
  title: {
    text: 'My Chart'
  },
  series: [{
    name: 'Data Series',
    data: [1, 2, 3, 4, 5]
  }]
};

// Render the chart
function MyComponent() {
  return <CoreChart options={chartOptions} />;
}
```

## Props

The CoreChart component accepts the following props:

| Prop | Type | Description |
|------|------|-------------|
| `options` | Object | Highcharts options object that will be passed directly to the Highcharts library |
| `handleChartRef` | Function | Optional callback function to get a reference to the chart instance |
| `containerProps` | Object | Optional props to pass to the chart container (like className, style, event handlers, etc.) |

## Highcharts Credits

The CoreChart component disables the "Highcharts.com" credits watermark by default. If you need to display or customize the credits, you can set the `credits` property in your chart options:

```jsx
// Enable default credits
const chartOptions = {
  // ... your chart options
  credits: {
    enabled: true
  }
};

// Customize credits
const chartOptions = {
  // ... your chart options
  credits: {
    enabled: true,
    text: 'Custom Credits Text',
    href: 'https://example.com',
    style: {
      color: '#999999',
      fontSize: '10px'
    }
  }
};
```

## Examples

See `CoreChartExample.js` for examples of different chart types.

### Bar Chart

```jsx
const barChartOptions = {
  chart: {
    type: 'bar',
    height: 300
  },
  credits: { enabled: false }, // Optional as it's disabled by default
  title: {
    text: 'Simple Bar Chart'
  },
  xAxis: {
    categories: ['Category A', 'Category B', 'Category C'],
  },
  series: [
    {
      name: 'Series 1',
      data: [10, 20, 30]
    }
  ]
};

<CoreChart options={barChartOptions} />
```

### Pie Chart

```jsx
const pieChartOptions = {
  chart: {
    type: 'pie',
    height: 300
  },
  credits: { enabled: false }, // Optional as it's disabled by default
  title: {
    text: 'Data Distribution'
  },
  series: [
    {
      name: 'Data',
      data: [
        { name: 'Segment A', y: 45 },
        { name: 'Segment B', y: 25 },
        { name: 'Segment C', y: 30 }
      ]
    }
  ]
};

<CoreChart options={pieChartOptions} />
```

## Difference from the existing Charts Component

Unlike the existing `Charts` component in the codebase that has specific formatting for different chart types and complex conversion logic, the CoreChart component:

1. Directly passes your options to Highcharts
2. Does not modify or process your options (except for disabling credits by default)
3. Provides a simpler, more direct way to render any chart type
4. Allows full control over chart configuration

## Highcharts Documentation

For full documentation on available options and chart types, refer to the [Highcharts API Documentation](https://api.highcharts.com/highcharts/). 