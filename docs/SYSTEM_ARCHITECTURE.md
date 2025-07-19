# NeoKPI System Architecture - High Level Component Interaction

## System Overview

The NeoKPI system is a browser-based alert debugging and notes management application built with modern JavaScript ES6 modules. It provides comprehensive CRUD operations, import/export functionality, search capabilities, and analytics for managing alert-related notes and metadata.

## High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                NEOKPI SYSTEM                                    │
│                              Browser Application                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PRESENTATION  │    │   APPLICATION   │    │    BUSINESS     │    │      DATA       │
│      LAYER      │    │     LAYER       │    │     LAYER       │    │     LAYER       │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  UI Components  │◄──►│  Core App       │◄──►│  Feature        │◄──►│  Storage        │
│                 │    │  Management     │    │  Managers       │    │  Systems        │
│ • Modal Manager │    │                 │    │                 │    │                 │
│ • UI Manager    │    │ • Application   │    │ • Notes Manager │    │ • IndexedDB     │
│ • NotepadUI     │    │ • App State     │    │ • Tag Manager   │    │ • LocalStorage  │
│ • TagsUI        │    │ • Global Scope  │    │ • Filter Manager│    │ • CSV Files     │
│ • Settings      │    │ • Keyboard Mgr  │    │ • Bulk Processor│    │ • External APIs │
│                 │    │                 │    │ • Metadata Mgr  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   UTILITIES &   │    │   SERVICES &    │    │   EXTERNAL      │    │   DEVELOPMENT   │
│    HELPERS      │    │   SUPPORT       │    │   INTEGRATIONS  │    │    TOOLS        │
│                 │    │                 │    │                 │    │                 │
│ • Utils         │    │ • Settings Mgr  │    │ • S3 Presigner  │    │ • Admin Tools   │
│ • Storage Mgr   │    │ • Video Controls│    │ • Dash API      │    │ • Debug Console │
│ • Admin Tools   │    │ • Fireworks     │    │ • Browser APIs  │    │ • Test Suite    │
│ • Keyboard Help │    │ • Notifications │    │                 │    │ • Global Scope  │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Component Interaction Flow

### 1. **Application Initialization Flow**

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐
│   index.js  │────►│ Application  │────►│ Feature Modules │────►│ UI Components│
│             │     │              │     │                 │     │              │
│ • Entry     │     │ • Init Core  │     │ • Notes Manager │     │ • Notepad UI │
│   Point     │     │ • Setup DOM  │     │ • Tag Manager   │     │ • Modal Mgr  │
│ • Global    │     │ • Event      │     │ • Bulk Processor│     │ • Settings   │
│   Expose    │     │   Handlers   │     │ • Metadata Mgr  │     │ • Tags UI    │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────┘
```

### 2. **Data Flow Architecture**

```
┌─────────────────┐                    ┌─────────────────┐
│   USER INPUT    │                    │   DATA OUTPUT   │
│                 │                    │                 │
│ • Keyboard      │                    │ • Notifications │
│ • Mouse Clicks  │                    │ • CSV Export    │
│ • File Upload   │◄──────────────────►│ • Visual UI     │
│ • Form Submit   │                    │ • Local Storage │
└─────────────────┘                    └─────────────────┘
         │                                     ▲
         ▼                                     │
┌─────────────────┐     ┌─────────────────┐    │
│  UI COMPONENTS  │────►│  BUSINESS LOGIC │────┘
│                 │     │                 │
│ • Modal Dialogs │     │ • Notes CRUD    │
│ • Input Fields  │     │ • Tag Processing│
│ • Buttons       │     │ • Search/Filter │
│ • Panels        │     │ • Import/Export │
└─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  DATA STORAGE   │
                        │                 │
                        │ • IndexedDB     │
                        │ • localStorage  │
                        │ • Session State │
                        └─────────────────┘
```

### 3. **Service Layer Interactions**

```
┌────────────────┐    ┌─────────────────┐    ┌────────────────┐
│ NOTES SERVICE  │    │ METADATA SVC    │    │ SETTINGS SVC   │
│                │    │                 │    │                │
│ • CRUD Ops     │◄──►│ • API Intercept │◄──►│ • Config Mgmt  │
│ • Search       │    │ • S3 Integration│    │ • Persistence  │
│ • Import/Export│    │ • URL Management│    │ • Validation   │
│ • Analytics    │    │ • Download Mgmt │    │ • Defaults     │
└────────────────┘    └─────────────────┘    └────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌────────────────────────────────────────────────────────────┐
│                    INDEXEDDB MANAGER                       │
│                                                            │
│ • Database Initialization  • Transaction Management        │
│ • Store Configuration      • Error Handling                │
│ • CRUD Operations         • Performance Optimization       │
│ • Index Management        • Cleanup & Maintenance          │
└────────────────────────────────────────────────────────────┘
```

### 4. **Event System & Communication**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  USER EVENTS    │────►│  EVENT ROUTING  │────►│  ACTION HANDLERS│
│                 │     │                 │     │                 │
│ • Key Presses   │     │ • Keyboard Mgr  │     │ • Save Note     │
│ • Button Clicks │     │ • UI Event Mgr  │     │ • Load Alert    │
│ • File Uploads  │     │ • Global Scope  │     │ • Export Data   │
│ • Form Submits  │     │ • App State     │     │ • Import CSV    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │  STATE UPDATES  │
                        │                 │
                        │ • UI Refresh    │
                        │ • Data Sync     │
                        │ • Notifications │
                        │ • Status Updates│
                        └─────────────────┘
```

## Core System Components

### **Presentation Layer**
- **UI Manager**: Main UI coordination and notifications
- **Modal Manager**: Dialog and popup management
- **NotepadUI**: Note editing interface
- **TagsUI**: Tag management and filtering interface
- **Settings Modal**: Configuration interface

### **Application Layer**
- **Application**: Main application orchestrator
- **App State**: Global application state management
- **Keyboard Manager**: Keyboard shortcut handling
- **Global Scope**: Development and console access

### **Business Layer**
- **Notes Manager**: Core notes CRUD operations
- **Tag Manager**: Tag processing and management
- **Filter Manager**: Search and filtering logic
- **Bulk Processor**: Batch operations handling
- **Metadata Manager**: External data integration

### **Data Layer**
- **IndexedDB Manager**: Database abstraction layer
- **Storage Manager**: localStorage wrapper
- **CSV Import/Export**: File format handlers

### **Support Services**
- **Settings Manager**: Configuration management
- **Utils**: Common utility functions
- **Admin Tools**: Development and debugging tools

## Data Models

### **Note Entity**
```javascript
{
  id: number,           // Auto-increment primary key
  alertId: string,      // Foreign key to alert system
  content: string,      // Note text content
  tags: string[],       // Associated tags array
  category: string,     // Alert type/category
  createdAt: string,    // ISO timestamp
  updatedAt: string,    // ISO timestamp
  timestamp: string     // Display timestamp
}
```

### **Metadata Entity**
```javascript
{
  alertId: string,      // Primary key
  url: string,         // S3 metadata URL
  content: object,     // Downloaded metadata
  timestamp: string,   // ISO timestamp
  downloaded: boolean  // Status flag
}
```

### **Settings Entity**
```javascript
{
  presignerUrl: string,     // S3 presigner service URL
  autoSaveNotes: boolean,   // Auto-save preference
  showKeyboardHints: boolean, // UI preference
  enableFireworks: boolean  // Animation preference
}
```

## Integration Points

### **External Systems**
- **S3 Presigner Service**: For secure metadata downloads
- **Dash API**: Alert system integration
- **Browser APIs**: File system, clipboard, localStorage

### **Internal Interfaces**
- **IndexedDB**: Primary data persistence
- **localStorage**: Settings and session data
- **CSV Files**: Import/export data format
- **Console API**: Debug and administration

## Development & Testing

### **Development Tools**
- **Global Scope Exposure**: Console access to all managers
- **Admin Tools**: Data management and statistics
- **Test UI**: Standalone testing interface
- **Debug Logging**: Comprehensive logging system

### **Quality Assurance**
- **Vitest Test Suite**: Unit and integration tests
- **Error Handling**: Comprehensive error management
- **Input Validation**: Data sanitization and validation
- **Performance Monitoring**: Database optimization

This architecture provides a clear separation of concerns, modular design, and comprehensive functionality for managing alert debugging workflows with professional-grade features and maintainability.
