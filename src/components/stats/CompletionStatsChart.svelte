<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { CompletionStats } from '../../lib/statistics/dataProcessor';
  
  // Props using Svelte 5 runes syntax
  let { data, width = 600, height = 300, interval = 'week' } = $props<{ 
    data: CompletionStats[],
    width?: number,
    height?: number,
    interval?: 'week' | 'month'
  }>();
  
  let svgElement: SVGSVGElement;
  let tooltip: HTMLDivElement;
  
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  
  $effect(() => {
    if (!data || !data.length || !svgElement) return;
    
    // Clear previous chart
    d3.select(svgElement).selectAll("*").remove();
    
    // Create the SVG
    const svg = d3.select(svgElement)
      .attr("width", width)
      .attr("height", height);
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create the chart group
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
      .domain(data.map(d => d3.timeFormat(interval === 'week' ? "%V/%Y" : "%b %Y")(d.date)))
      .range([0, chartWidth])
      .padding(0.3);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.completed + d.partial + d.failed) as number])
      .range([chartHeight, 0]);
    
    // Create the stack
    const stack = d3.stack()
      .keys(["completed", "partial", "failed"])
      .value((d: any, key) => d[key]);
    
    const stackedData = stack(data as any);
    
    // Define colors for each state
    const colors = ["#10B981", "#F59E0B", "#EF4444"]; // Green, Yellow, Red
    
    // Create tooltip
    const tooltipDiv = d3.select(tooltip)
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background", "#fff")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("pointer-events", "none")
      .style("z-index", "10");
    
    // Add the stacked bars with tooltip
    chart.append("g")
      .selectAll("g")
      .data(stackedData)
      .join("g")
      .attr("fill", (d, i) => colors[i])
      .selectAll("rect")
      .data(d => d)
      .join("rect")
      .attr("x", (d, i) => x(d3.timeFormat(interval === 'week' ? "%V/%Y" : "%b %Y")(data[i].date)) as number)
      .attr("y", d => y(d[1]))
      .attr("height", d => y(d[0]) - y(d[1]))
      .attr("width", x.bandwidth())
      .on("mouseover", function(event, d) {
        const i = d.index;
        const category = d.series.key;
        const value = d[1] - d[0];
        const total = data[i].completed + data[i].partial + data[i].failed;
        const percentage = Math.round((value / total) * 100);
        const dateFormat = interval === 'week' ? 
          `Week ${d3.timeFormat("%V, %Y")(data[i].date)}` : 
          d3.timeFormat("%B %Y")(data[i].date);
        
        tooltipDiv
          .style("visibility", "visible")
          .html(`
            <strong>${dateFormat}</strong><br>
            <strong>${category === 'completed' ? 'Successful' : category === 'partial' ? 'Partial' : 'Failed'}</strong>: ${value} sets (${percentage}%)<br>
            <strong>Total</strong>: ${total} sets
          `);
        
        tooltipDiv.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", function() {
        tooltipDiv.style("visibility", "hidden");
      });
    
    // Add the X axis
    chart.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    // Add the Y axis
    chart.append("g")
      .call(d3.axisLeft(y));
    
    // Add chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`Performance by ${interval}`);
    
    // Add legend
    const legend = svg.append("g")
      .attr("transform", `translate(${width - margin.right - 120}, ${margin.top})`);
    
    const legendItems = [
      { label: "Success (A)", color: colors[0] },
      { label: "Partial (B)", color: colors[1] },
      { label: "Failed (C)", color: colors[2] }
    ];
    
    legendItems.forEach((item, i) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${i * 20})`);
      
      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", item.color);
      
      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(item.label)
        .style("font-size", "12px");
    });
  });
</script>

<div class="completion-stats-chart">
  <svg bind:this={svgElement}></svg>
  <div class="tooltip" bind:this={tooltip}></div>
</div>

<style>
  .completion-stats-chart {
    width: 100%;
    height: 100%;
    overflow: visible;
    position: relative;
  }
  
  :global(.completion-stats-chart text) {
    fill: currentColor;
  }
  
  :global(.completion-stats-chart line,
  .completion-stats-chart path) {
    stroke: currentColor;
  }
  
  .tooltip {
    position: absolute;
    z-index: 10;
    visibility: hidden;
  }
</style>
