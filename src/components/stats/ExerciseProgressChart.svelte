<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { ExerciseProgress } from '../../lib/statistics/dataProcessor';
  
  // Props using Svelte 5 runes syntax
  let { data, width = 600, height = 300 } = $props<{ 
    data: ExerciseProgress, 
    width?: number, 
    height?: number 
  }>();
  
  let svgElement: SVGSVGElement;
  let tooltip: HTMLDivElement;
  
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  
  function formatDate(date: Date): string {
    return date.toLocaleDateString();
  }
  
  $effect(() => {
    if (!data || !data.dates.length || !svgElement) return;
    
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
    const x = d3.scaleTime()
      .domain(d3.extent(data.dates) as [Date, Date])
      .range([0, chartWidth]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(data.weights) as number * 1.1]) // 10% padding on top
      .range([chartHeight, 0]);
    
    // Create line generator
    const line = d3.line<[Date, number, string]>()
      .x(d => x(d[0]))
      .y(d => y(d[1]));
    
    // Combine data for plotting
    const combinedData = data.dates.map((date, i) => [
      date,
      data.weights[i],
      data.states[i]
    ] as [Date, number, string]);
    
    // Add the X axis
    chart.append("g")
      .attr("transform", `translate(0, ${chartHeight})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat("%d/%m/%y")))
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", ".15em")
      .attr("transform", "rotate(-45)");
    
    // Add the Y axis
    chart.append("g")
      .call(d3.axisLeft(y));
    
    // Add the line
    chart.append("path")
      .datum(combinedData)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 2)
      .attr("d", line as any);
    
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
    
    // Add data points with tooltip interaction
    chart.selectAll(".dot")
      .data(combinedData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d[0]))
      .attr("cy", d => y(d[1]))
      .attr("r", 5)
      .attr("fill", d => {
        switch (d[2]) {
          case 'A': return "#10B981"; // Green
          case 'B': return "#F59E0B"; // Yellow
          case 'C': return "#EF4444"; // Red
          default: return "#6B7280"; // Gray
        }
      })
      .on("mouseover", function(event, d) {
        const status = d[2] === 'A' ? 'Success' : d[2] === 'B' ? 'Partial' : d[2] === 'C' ? 'Failed' : 'Unknown';
        tooltipDiv
          .style("visibility", "visible")
          .html(`
            <strong>Date:</strong> ${formatDate(d[0])}<br>
            <strong>Weight:</strong> ${d[1]} kg<br>
            <strong>Status:</strong> ${status}
          `);
        
        // Position the tooltip near the circle
        const [x, y] = d3.pointer(event);
        tooltipDiv.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 30) + "px");
      })
      .on("mouseout", function() {
        tooltipDiv.style("visibility", "hidden");
      });
    
    // Add chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(data.exerciseName);
    
    // Add y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", margin.left / 3)
      .attr("x", 0 - (height / 2))
      .attr("text-anchor", "middle")
      .text("Weight (kg)");
  });
</script>

<div class="exercise-progress-chart">
  <svg bind:this={svgElement}></svg>
  <div class="tooltip" bind:this={tooltip}></div>
</div>

<style>
  .exercise-progress-chart {
    width: 100%;
    height: 100%;
    overflow: visible;
    position: relative;
  }
  
  :global(.exercise-progress-chart text) {
    fill: currentColor;
  }
  
  :global(.exercise-progress-chart line,
  .exercise-progress-chart path) {
    stroke: currentColor;
  }
  
  .tooltip {
    position: absolute;
    z-index: 10;
    visibility: hidden;
  }
</style>
