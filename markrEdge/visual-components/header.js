/**
 * Header Banner Visualizer - Displays header information including speed, time, and alerts
 * 
 * Expected data structure extracted from metadata:
 * - Session info, device info, speed data, time data, alerts
 */
import { BaseVisualizer } from './base-visualizer.js';

// Modular component for Speed Badge
class SpeedBadge {
  constructor() {
    this.group = new Konva.Group({
      draggable: true
    });
  }

  //data is {currentSpeed: number, speedLimit: number, timeZone: string}
  create(data, x, y) {
    const badgeWidth = 55;  // Reduced from 80
    const badgeHeight = 60; // Reduced from 80
    const cornerRadius = 8; // Increased from 6 for more modern look
    
    // Set initial position
    this.group.position({ x, y });
    
    this._createBadge(data, badgeWidth, badgeHeight, cornerRadius);
    return this.group;
  }

  _computeBgColor(currentSpeed, speedLimit) {
    const isOverLimit = currentSpeed > speedLimit;
    const speedRatio = currentSpeed / speedLimit;
    
    // Dynamic background color based on speed
    if (isOverLimit) {
      return speedRatio > 1.2 ? '#DC3545' : '#FF6B35'; // Red or orange for speeding
    } else if (speedRatio > 0.9) {
      return '#FFC107'; // Yellow for approaching limit
    }
    return '#28A745'; // Green for safe speed
  }

  update(data) {
    if (!this.group) return;
    
    const isOverLimit = data.currentSpeed > data.speedLimit;
    const bgColor = this._computeBgColor(data.currentSpeed, data.speedLimit);
    
    // Find and update existing elements
    const background = this.group.findOne('.badge-background');
    const speedText = this.group.findOne('.current-speed');
    const limitText = this.group.findOne('.speed-limit');
    
    if (background) background.fill(bgColor);
    if (speedText) speedText.text(data.currentSpeed.toString());
    if (limitText) {
      limitText.text(`LIMIT ${data.speedLimit}`);
      limitText.fill(isOverLimit ? '#FFE6E6' : 'rgba(255, 255, 255, 0.9)');
    }
  }

  _createBadge(data, badgeWidth, badgeHeight, cornerRadius) {
    // Clear existing children if any
    this.group.removeChildren();
    
    const isOverLimit = data.currentSpeed > data.speedLimit;
    const bgColor = this._computeBgColor(data.currentSpeed, data.speedLimit);
    
    // Add drag bounds function to keep within layer bounds
    this.group.dragBoundFunc(function(pos) {
      const stage = this.getStage();
      if (!stage) return pos;
      
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      // Calculate bounds considering badge dimensions
      const minX = 0;
      const maxX = stageWidth - badgeWidth;
      const minY = 0;
      const maxY = stageHeight - badgeHeight;
      
      return {
        x: Math.max(minX, Math.min(pos.x, maxX)),
        y: Math.max(minY, Math.min(pos.y, maxY))
      };
    });
    
    // Create badge background with subtle gradient effect
    const background = new Konva.Rect({
      x: 0, // Relative to group position
      y: 0, // Relative to group position
      width: badgeWidth,
      height: badgeHeight,
      fill: bgColor,
      cornerRadius: cornerRadius,
      opacity: 0.7, // More transparent to match other overlay elements
      shadowColor: 'rgba(0, 0, 0, 0.2)',
      shadowBlur: 3,
      shadowOffset: { x: 0, y: 1 },
      name: 'badge-background' // Add name for easy finding
    });
    
    // Create subtle inner border for depth
    const innerBorder = new Konva.Rect({
      x: 1, // Relative to group position
      y: 1, // Relative to group position
      width: badgeWidth - 2,
      height: badgeHeight - 2,
      stroke: 'rgba(255, 255, 255, 0.15)', // More transparent
      strokeWidth: 1,
      cornerRadius: cornerRadius - 1
    });
    
    // Create divider line with better styling
    const dividerY = badgeHeight * 0.58;
    const dividerLine = new Konva.Line({
      points: [8, dividerY, badgeWidth - 8, dividerY], // Relative to group position
      stroke: 'rgba(255, 255, 255, 0.3)', // More transparent
      strokeWidth: 1
    });
    
    // Create speed text with better typography
    const speedText = new Konva.Text({
      x: 0, // Relative to group position
      y: badgeHeight * 0.12, // Relative to group position
      width: badgeWidth,
      height: badgeHeight * 0.35,
      text: data.currentSpeed.toString(),
      fontSize: 16, // Increased from 16 for better readability
      fontFamily: 'Arial Black', // Bolder font
      // fontStyle: 'bold',
      fill: '#ffffff',
      align: 'center',
      verticalAlign: 'middle',
      shadowColor: 'rgba(0, 0, 0, 0.7)', // Stronger text shadow for better visibility
      shadowBlur: 3,
      shadowOffset: { x: 0, y: 1 },
      name: 'current-speed' // Add name for easy finding
    });
    
    // Create "mph" text with refined styling
    const mphText = new Konva.Text({
      x: 0, // Relative to group position
      y: badgeHeight * 0.42, // Relative to group position
      width: badgeWidth,
      height: badgeHeight * 0.15,
      text: 'mph',
      fontSize: 9, // Slightly smaller
      fontFamily: 'Arial',
      fontStyle: 'normal',
      fill: 'rgba(255, 255, 255, 0.8)', // Slightly transparent
      align: 'center',
      verticalAlign: 'middle'
    });
    
    // Create speed limit text as single line
    const limitText = new Konva.Text({
      x: 0, // Relative to group position
      y: badgeHeight * 0.68, // Relative to group position
      width: badgeWidth,
      height: badgeWidth * 0.25,
      text: `LIMIT ${data.speedLimit}`,
      fontSize: 10,
      fontFamily: 'Arial',
      fontStyle: 'bold',
      fill: isOverLimit ? '#FFE6E6' : 'rgba(255, 255, 255, 0.9)',
      align: 'center',
      verticalAlign: 'middle',
      name: 'speed-limit' // Add name for easy finding
    });
    
    this.group.add(background);
    this.group.add(innerBorder);
    this.group.add(dividerLine);
    this.group.add(speedText);
    this.group.add(mphText);
    this.group.add(limitText);
    
    return this.group;
  }
}

// Modular component for individual message notification
class MessageNotification {
  constructor() {
    this.group = new Konva.Group();
  }

  create(message, x, y, width) {
    const cardHeight = 20;  // Even more compact
    const cardCornerRadius = 6; // Increased for modern look
    
    // Create minimal card background
    const background = new Konva.Rect({
      x: x,
      y: y,
      width: width,
      height: cardHeight,
      fill: 'rgba(49, 74, 127, 0.7)', // Semi-transparent blue
      stroke: 'rgba(73, 103, 165, 0.6)', // Matching blue tint for border
      strokeWidth: 1,
      cornerRadius: cardCornerRadius,
      shadowColor: 'rgba(0, 0, 0, 0.15)', // Subtle shadow
      shadowBlur: 2,
      shadowOffset: { x: 0, y: 1 }
    });
    
    // Create modern alert text
    const text = new Konva.Text({
      x: x + 8, // Add padding
      y: y,
      width: width - 16, // Account for padding
      height: cardHeight,
      text: message,
      fontSize: 10, // Smaller, sleeker text
      fontFamily: 'Arial',
      fontStyle: 'normal', // Changed from bold to normal
      fill: 'rgba(255, 255, 255, 0.9)', // Slightly transparent white for softer look
      align: 'center',
      verticalAlign: 'middle',
      shadowColor: 'rgba(0, 0, 0, 0.5)', // Reduced shadow opacity
      shadowBlur: 1, // Reduced shadow blur
      shadowOffset: { x: 0, y: 1 }
    });
    
    this.group.add(background);
    this.group.add(text);
    
    return this.group;
  }
}

// Container for all message notifications
class NotificationContainer {
  constructor() {
    this.group = new Konva.Group();
    this.notifications = [];
    this.centerX = 0;
    this.startY = 0;
    this.timers = new Map(); // Store timers for auto-removal
  }

  init(centerX, startY) {
    this.centerX = centerX;
    this.startY = startY;
    return this.group;
  }

  push(messageText, duration = 5000) {
    const cardPadding = 6;
    const cardSpacing = 3;
    
    // Calculate card width based on message length
    const maxTextWidth = messageText.length * 6.5;
    const cardWidth = Math.min(maxTextWidth + (cardPadding * 2), 200);
    
    const startX = this.centerX - (cardWidth / 2);
    const currentY = this.startY + (this.notifications.length * (20 + cardSpacing));

    const notification = new MessageNotification();
    const notificationGroup = notification.create(messageText, startX, currentY, cardWidth);
    
    this.notifications.push(notification);
    this.group.add(notificationGroup);

    // Set timer for auto-removal
    const timer = setTimeout(() => {
      this.removeMessage(notification);
    }, duration);

    this.timers.set(notification, timer);
    
    // Redraw the layer
    this.group.getLayer()?.batchDraw();
    
    return notification;
  }

  removeMessage(notification) {
    const index = this.notifications.indexOf(notification);
    if (index === -1) return;

    // Clear the timer
    const timer = this.timers.get(notification);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(notification);
    }

    // Remove the notification
    notification.group.destroy();
    this.notifications.splice(index, 1);

    // Reposition remaining notifications
    const cardSpacing = 3;
    this.notifications.forEach((notif, idx) => {
      const newY = this.startY + (idx * (20 + cardSpacing));
      notif.group.to({
        y: newY,
        duration: 0.2
      });
    });

    this.group.getLayer()?.batchDraw();
  }

  clearAll() {
    // Clear all timers
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();

    // Remove all notifications
    this.notifications.forEach(notification => {
      notification.group.destroy();
    });
    this.notifications = [];
    this.group.removeChildren();
    this.group.getLayer()?.batchDraw();
  }
}

// Modular component for Timestamp
class Timestamp {
  constructor(x, y, width) {
    // Create modern, clean datetime text with empty initial value
    this.textNode = new Konva.Text({
      x: x,
      y: y,
      width: width,
      text: '',
      fontSize: 11, // Reduced from 14 - much smaller
      fontFamily: 'monospace', // Monospace for better time readability
      fontStyle: 'normal',
      fill: '#ffffff',
      stroke: 'rgba(0, 0, 0, 0.3)', // Subtle stroke
      strokeWidth: 0.5, // Very thin stroke
      align: 'right',
      letterSpacing: 0.5, // Slight letter spacing for clarity
      name: 'datetime-text'
    });
  }

  init(x, y, width) {
    this.textNode.x(x);
    this.textNode.y(y);
    this.textNode.width(width);
    return this.textNode;
  }

  update(epochTime, timeZone) {
    if (!this.textNode) return;
    
    const formattedDateTime = this._formatDateTime(epochTime, timeZone);
    this.textNode.text(`${Math.floor(epochTime)} - ${formattedDateTime}`);
  }

  _formatDateTime(epochTime, timeZone) {
    const date = new Date(epochTime);
    
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      month: '2-digit',
      day: '2-digit',
      year: '2-digit'
    });
    
    // Get timezone abbreviation
    const timezoneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      timeZoneName: 'short'
    });
    const timezoneParts = timezoneFormatter.formatToParts(date);
    const timezone = timezoneParts.find(part => part.type === 'timeZoneName')?.value || 'UTC';
    
    const timeString = timeFormatter.format(date);
    const dateString = dateFormatter.format(date);
    return `${dateString} ${timeString} ${timezone}`;
  }
}

class Header extends BaseVisualizer {
  constructor(staticLayer, dynamicLayer, metadata = {}) {
    super(staticLayer, dynamicLayer, metadata);
    this.headerGroup = null;
    this.speedBadge = new SpeedBadge();
    this.notificationContainer = new NotificationContainer();
    this.timestamp = new Timestamp(0, 0, 0); // Initial values will be updated in init
  }

  processMetadata(metadata = {}) {
    this.gps_data = metadata.videoMetaData
    
    // Extract header banner data with comprehensive fallbacks
    return {
      // Speed and location data - dummy data for testing
      currentSpeed: metadata?.currentSpeed || 42,
      speedLimit: metadata?.speedLimit || 35,
      // Alert messages - dummy data for testing
      alertMessages: metadata?.alertMessages || ["🚨 SPEED LIMIT EXCEEDED", "👀 DRIVER ATTENTION"],
      
      // Time zone - fallback to dummy data
      timeZone: metadata?.timeZone || 'America/Los_Angeles',
    };
  }

  display(epochTime, H, W) {
    const padding = 10;

    // Create header group only once
    if (!this.headerGroup) {
      this.headerGroup = new Konva.Group();

      // Create speed badge (top-left)
      const speedBadgeGroup = this.speedBadge.create(this.data, padding, padding);
      this.headerGroup.add(speedBadgeGroup);
      
      // Initialize notification container (top-center)
      const notificationGroup = this.notificationContainer.init(
        W / 2, // center X
        padding // start Y
      );
      this.headerGroup.add(notificationGroup);

      // Add initial messages if any
      if (this.data.alertMessages && this.data.alertMessages.length > 0) {
        this.data.alertMessages.forEach(message => {
          this.notificationContainer.push(message, 5000); // 5 second duration
        });
      }
      
      // Initialize timestamp position (top-right)
      const timestampNode = this.timestamp.init(
        0, // x position
        padding, // y position
        W // Use full width to allow right alignment
      );
      timestampNode.align('right');
      timestampNode.width(W - 2 * padding); // Account for padding on both sides
      this.headerGroup.add(timestampNode);
      
      this.staticLayer.add(this.headerGroup);
    } else {
      // Update timestamp (this changes frequently)
      this.data = {
        currentSpeed: 25,
        speedLimit: 35,
        timeZone: 'America/Los_Angeles'
      };
      // use gps_data to get the current by the closest timestamp i.e. epochtime s
      const closestGPSData = this.gps_data.reduce((prev, curr) => {
        return (Math.abs(curr.timestamp - epochTime) < Math.abs(prev.timestamp - epochTime) ? curr : prev);
      });
      this.data = {
        currentSpeed: Math.round(closestGPSData.speed),
        speedLimit: 60, // dummy 
        timeZone: closestGPSData.timeZone || 'America/Los_Angeles' // dummy fallback
      };

      this.speedBadge.update(this.data);
      this.timestamp.update(epochTime, this.data.timeZone);
      this.staticLayer.batchDraw();
    }
  }

}

export { Header };
