<script lang="ts">
  import { onMount } from 'svelte';
  import * as d3 from 'd3';
  import type { VolumeData } from '../../lib/statistics/dataProcessor';
  
  // Props using Svelte 5 runes syntax
  let { 
    data, 
    width = 600, 
    height = 300,
    selectedExercise = ''
  } = $props<{ 
    data: VolumeData[],
    width?: number,
    height?: number,
    selectedExercise?: string
  }>();
  
  let svgElement: SVGSVGElement;
  let tooltip: HTMLDivElement;
  
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  
  // Format large numbers with K/M suffix
  function formatVolume(volume: number): string {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toString();
  }
  
  $effect(() => {
    if (!data || !data.length || !svgElement) return;
    
    // Clear previous chart
    d3.select(svgElement).selectAll("*").remove();
    
    // Filter data by selected exercise if provided
    let filteredData = selectedExercise ? 
      data.filter(d => d.exercise === selectedExercise) : 
      data;
    
    // Group data by date and sum volumes
    const volumeByDate = d3.group(filteredData, d => d.date.toDateString());
    const aggregatedData = Array.from(volumeByDate, ([dateStr, items]) => {
      return {
        date: new Date(dateStr),
        volume: d3.sum(items, d => d.volume)
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
    
    if (aggregatedData.length === 0) return;
    
    // Create the SVG with responsive width
    const svg = d3.select(svgElement)
      .attr("width", "100%")  // Changed to 100%
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");
    
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Create the chart group
    const chart = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
    
    // Create scales
    const x = d3.scaleTime()
      .domain(d3.extent(aggregatedData, d => d.date) as [Date, Date])
      .range([0, chartWidth]);
    
    const y = d3.scaleLinear()
      .domain([0, d3.max(aggregatedData, d => d.volume) as number * 1.1]) // 10% padding
      .range([chartHeight, 0]);
    
    // Create area generator for fill under the line
    const area = d3.area<{date: Date, volume: number}>()
      .x(d => x(d.date))
      .y0(chartHeight)
      .y1(d => y(d.volume));
    
    // Create line generator
    const line = d3.line<{date: Date, volume: number}>()
      .x(d => x(d.date))
      .y(d => y(d.volume))
      .curve(d3.curveMonotoneX); // Smoother curve
    
    // Add the area fill
    chart.append("path")
      .datum(aggregatedData)
      .attr("fill", "rgba(59, 130, 246, 0.1)") // Light blue fill
      .attr("d", area);
    
    // Add the line
    chart.append("path")
      .datum(aggregatedData)
      .attr("fill", "none")
      .attr("stroke", "rgb(59, 130, 246)") // Blue line
      .attr("stroke-width", 2)
      .attr("d", line);
    
    // Create tooltip with improved visibility
    const tooltipDiv = d3.select(tooltip)
      .style("position", "fixed")  // Changed from absolute to fixed
      .style("visibility", "hidden")
      .style("background", "#fff")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("box-shadow", "0 4px 8px rgba(0,0,0,0.15)")  // Enhanced shadow
      .style("pointer-events", "none")
      .style("z-index", "1000");  // Increased z-index
    
    // Add data points with tooltips
    chart.selectAll(".dot")
      .data(aggregatedData)
      .enter().append("circle")
      .attr("class", "dot")
      .attr("cx", d => x(d.date))
      .attr("cy", d => y(d.volume))
      .attr("r", 5)
      .attr("fill", "rgb(59, 130, 246)")
      .on("mouseover", function(event, d) {
        tooltipDiv
          .style("visibility", "visible")
          .html(`
            <strong>Date:</strong> ${d.date.toLocaleDateString()}<br>
            <strong>Volume:</strong> ${d.volume.toLocaleString()} kg×reps
          `);
        
        // Improved positioning to prevent tooltip from going off-screen
        const tooltipWidth = 200;  // Approximate width of tooltip
        const xPos = Math.min(event.clientX + 10, window.innerWidth - tooltipWidth - 20);
        const yPos = Math.max(20, event.clientY - 60);
        
        tooltipDiv.style("left", xPos + "px")
                .style("top", yPos + "px");
      })
      .on("mouseout", function() {
        tooltipDiv.style("visibility", "hidden");
      });
    
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
      .call(d3.axisLeft(y).tickFormat(d => formatVolume(+d)));
    
    // Add chart title
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`Training Volume${selectedExercise ? ': ' + selectedExercise : ''}`);
    
    // Add y-axis label
    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", margin.left / 3)
      .attr("x", 0 - (height / 2))
      .attr("text-anchor", "middle")
      .text("Volume (kg×reps)");
  });
</script>

<div class="volume-chart">
  {#if data && data.length > 0}
    <svg bind:this={svgElement} width="100%" height={height}></svg>
    <div class="tooltip" bind:this={tooltip}></div>
  {:else}
    <div class="empty-state">
      <p>No volume data available{selectedExercise ? ' for ' + selectedExercise : ''}.</p>
    </div>
  {/if}
</div>

<style>
  .volume-chart {
    width: 100%;
    height: 100%;
    overflow: visible;
    position: relative;
  }
  
  .empty-state {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    min-height: 200px;
    color: #6b7280;
    background-color: #f9fafb;
    border: 1px dashed #d1d5db;
    border-radius: 4px;
  }
  
  :global(.volume-chart text) {
    fill: currentColor;
  }
  
  :global(.volume-chart line,
  .volume-chart path.domain) {
    stroke: currentColor;
  }
  
  .tooltip {
    position: fixed;
    z-index: 1000;
    visibility: hidden;
    max-width: 300px;
    width: auto;
  }
</style>
