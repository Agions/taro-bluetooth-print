# 架构图集

本文档包含Taro蓝牙打印库重构后的各种架构图，使用Mermaid语法编写，可以在支持Mermaid的工具中渲染。

## 1. 整体系统架构图

```mermaid
graph TB
    subgraph "Application Layer"
        API[TaroBluePrint API]
        Config[Configuration Manager]
        Gateway[Event Gateway]
        Container[IoC Container]
    end

    subgraph "Domain Layer"
        BT_SVC[Bluetooth Domain Service]
        PRINT_SVC[Printer Domain Service]
        CMD_QUEUE[Command Queue Service]
        STATE_MGR[State Manager]
        EVENT_SVC[Event Domain Service]
    end

    subgraph "Infrastructure Layer"
        BT_ADAPTER[Bluetooth Adapters]
        PRINT_ADAPTER[Printer Adapters]
        STORAGE[Storage Adapters]
        LOGGER[Logger Infrastructure]
        CACHE[Cache Infrastructure]
        MONITOR[Monitoring Infrastructure]
    end

    subgraph "External Systems"
        HARDWARE[Bluetooth Hardware]
        PRINTERS[Printer Devices]
        PLATFORMS[Platform APIs]
    end

    API --> Container
    Config --> Container
    Gateway --> Container

    Container --> BT_SVC
    Container --> PRINT_SVC
    Container --> CMD_QUEUE
    Container --> STATE_MGR
    Container --> EVENT_SVC

    BT_SVC --> BT_ADAPTER
    PRINT_SVC --> CMD_QUEUE
    PRINT_SVC --> PRINT_ADAPTER
    EVENT_SVC --> Gateway
    STATE_MGR --> STORAGE

    BT_ADAPTER --> HARDWARE
    PRINT_ADAPTER --> PRINTERS
    BT_ADAPTER --> PLATFORMS
    PRINT_ADAPTER --> PLATFORMS

    STORAGE --> CACHE
    EVENT_SVC --> LOGGER
    BT_SVC --> MONITOR
    PRINT_SVC --> MONITOR
```

## 2. 依赖注入容器架构图

```mermaid
graph LR
    subgraph "IoC Container"
        Registry[Service Registry]
        Factory[Service Factory]
        Lifecycle[Lifecycle Manager]
    end

    subgraph "Service Lifecycle"
        Singleton[Singleton Services]
        Transient[Transient Services]
        Scoped[Scoped Services]
    end

    subgraph "Service Registration"
        Core[Core Services]
        Bluetooth[Bluetooth Services]
        Printer[Printer Services]
        Utils[Utility Services]
    end

    Registry --> Factory
    Factory --> Lifecycle
    Lifecycle --> Singleton
    Lifecycle --> Transient
    Lifecycle --> Scoped

    Core --> Registry
    Bluetooth --> Registry
    Printer --> Registry
    Utils --> Registry

    Singleton -.-> |Instance Reuse| Factory
    Transient -.-> |New Instance| Factory
    Scoped -.-> |Scope Instance| Factory
```

## 3. 事件驱动架构图

```mermaid
sequenceDiagram
    participant User
    participant API
    participant EventBus as Event Bus
    participant Bluetooth as Bluetooth Service
    participant Printer as Printer Service
    participant Hardware as Hardware Device

    User->>API: connectDevice(deviceId)
    API->>Bluetooth: initialize()
    Bluetooth->>EventBus: publish(AdapterInitialized)
    EventBus->>Printer: handle(AdapterInitialized)

    Bluetooth->>Hardware: scanForDevices()
    Hardware-->>Bluetooth: deviceFound(device)
    Bluetooth->>EventBus: publish(DeviceFound)
    EventBus->>API: notify(DeviceFound)
    EventBus->>User: updateUI(DeviceFound)

    User->>API: print(content)
    API->>Printer: print(content)
    Printer->>EventBus: publish(PrintStarted)
    EventBus->>Bluetooth: prepareConnection()
    Bluetooth->>Hardware: connect(device)
    Hardware-->>Bluetooth: connected()
    Bluetooth->>EventBus: publish(DeviceConnected)

    Printer->>Hardware: sendPrintData()
    Hardware-->>Printer: printCompleted()
    Printer->>EventBus: publish(PrintCompleted)
    EventBus->>API: notify(PrintCompleted)
    EventBus->>User: showSuccess()
```

## 4. 命令处理流程图

```mermaid
flowchart TD
    Start([Print Request]) --> Validate{Validate Input}
    Validate -->|Invalid| Error[Return Error]
    Validate -->|Valid| CreateCommand[Create Print Command]

    CreateCommand --> Enqueue[Enqueue to Command Queue]
    Enqueue --> CheckQueue{Queue Full?}
    CheckQueue -->|Yes| Wait[Wait for Slot]
    Wait --> Enqueue
    CheckQueue -->|No| Process[Process Command]

    Process --> Connect{Device Connected?}
    Connect -->|No| ConnectDevice[Connect Device]
    ConnectDevice --> Process
    Connect -->|Yes| PrepareData[Prepare Print Data]

    PrepareData --> SendData[Send Data to Device]
    SendData --> Success{Send Success?}
    Success -->|No| Retry{Retry Available?}
    Retry -->|Yes| WaitRetry[Wait and Retry]
    WaitRetry --> SendData
    Retry -->|No| Fail[Mark as Failed]

    Success -->|Yes| Complete[Mark as Completed]
    Complete --> Notify[Notify Completion]
    Fail --> Notify

    Notify --> End([End])
    Error --> End
```

## 5. 蓝牙适配器架构图

```mermaid
graph TB
    subgraph "Bluetooth Adapter Factory"
        Factory[Adapter Factory]
        Registry[Platform Registry]
    end

    subgraph "Adapter Implementations"
        WeApp[WeApp Adapter]
        H5[H5 Adapter]
        RN[RN Adapter]
        Harmony[Harmony Adapter]
    end

    subgraph "Base Adapter"
        Base[Base Bluetooth Adapter]
        Connection[Connection Manager]
        Discovery[Device Discovery]
        State[State Manager]
    end

    subgraph "Platform APIs"
        WeAppAPI[WeApp Bluetooth API]
        WebAPI[Web Bluetooth API]
        RNAPI[React Native API]
        HarmonyAPI[Harmony Bluetooth API]
    end

    Factory --> Registry
    Registry --> WeApp
    Registry --> H5
    Registry --> RN
    Registry --> Harmony

    WeApp --> Base
    H5 --> Base
    RN --> Base
    Harmony --> Base

    Base --> Connection
    Base --> Discovery
    Base --> State

    WeApp --> WeAppAPI
    H5 --> WebAPI
    RN --> RNAPI
    Harmony --> HarmonyAPI
```

## 6. 数据流架构图

```mermaid
graph LR
    subgraph "Input Layer"
        UserInput[User Input]
        API[API Calls]
        Config[Configuration]
    end

    subgraph "Processing Layer"
        Validation[Input Validation]
        BusinessLogic[Business Logic]
        EventProcessing[Event Processing]
    end

    subgraph "Storage Layer"
        Memory[Memory Storage]
        Cache[Cache Layer]
        Persistent[Persistent Storage]
    end

    subgraph "Output Layer"
        Hardware[Hardware Interface]
        Events[Event Notifications]
        Response[API Response]
    end

    UserInput --> Validation
    API --> Validation
    Config --> Validation

    Validation --> BusinessLogic
    BusinessLogic --> EventProcessing
    EventProcessing --> Memory
    EventProcessing --> Cache
    EventProcessing --> Persistent

    Memory --> Hardware
    Cache --> Hardware
    Persistent --> Hardware

    Hardware --> Events
    Hardware --> Response
    EventProcessing --> Events
    BusinessLogic --> Response
```

## 7. 错误处理架构图

```mermaid
flowchart TD
    Error([Error Occurred]) --> Catch{Error Handler?}
    Catch -->|No| Propagate[Propagate Up]
    Catch -->|Yes| Categorize[Error Categorization]

    Categorize --> UserError{User Error?}
    UserError -->|Yes| UserMessage[Return User-Friendly Message]

    UserError -->|No| SystemError{System Error?}
    SystemError -->|Yes| LogSystem[Log System Error]
    SystemError -->|No| BusinessError{Business Error?}

    BusinessError -->|Yes| LogBusiness[Log Business Error]
    BusinessError -->|No| UnknownError[Log Unknown Error]

    LogSystem --> Recover{Can Recover?}
    LogBusiness --> Recover
    UnknownError --> NoRecover[Cannot Recover]

    Recover -->|Yes| Retry{Retry Available?}
    Retry -->|Yes| WaitRetry[Wait and Retry]
    WaitRetry --> Error
    Retry -->|No| Fallback[Use Fallback]

    Recover -->|No| NoRecover
    Fallback --> End([End])
    NoRecover --> End
    UserMessage --> End
    Propagate --> End
```

## 8. 部署架构图

```mermaid
graph TB
    subgraph "Development Environment"
        DevLocal[Local Development]
        DevTest[Development Testing]
        DevCI[CI Pipeline]
    end

    subgraph "Testing Environment"
        TestUnit[Unit Tests]
        TestIntegration[Integration Tests]
        TestE2E[E2E Tests]
        TestPerf[Performance Tests]
    end

    subgraph "Staging Environment"
        StagingDeploy[Staging Deployment]
        StagingTest[Staging Testing]
        StagingMonitor[Staging Monitoring]
    end

    subgraph "Production Environment"
        ProdDeploy[Production Deployment]
        ProdMonitor[Production Monitoring]
        ProdScaling[Auto Scaling]
        ProdBackup[Backup & Recovery]
    end

    DevLocal --> DevTest
    DevTest --> DevCI
    DevCI --> TestUnit
    DevCI --> TestIntegration
    DevCI --> TestE2E

    TestUnit --> StagingDeploy
    TestIntegration --> StagingDeploy
    TestE2E --> StagingDeploy
    TestPerf --> StagingDeploy

    StagingDeploy --> StagingTest
    StagingTest --> StagingMonitor
    StagingMonitor --> ProdDeploy

    ProdDeploy --> ProdMonitor
    ProdMonitor --> ProdScaling
    ProdMonitor --> ProdBackup
```

## 9. 安全架构图

```mermaid
graph TB
    subgraph "Security Layers"
        Auth[Authentication Layer]
        Authz[Authorization Layer]
        Validation[Input Validation]
        Encryption[Data Encryption]
    end

    subgraph "Threat Protection"
        InputSan[Input Sanitization]
        RateLimit[Rate Limiting]
        Audit[Security Auditing]
        Monitoring[Security Monitoring]
    end

    subgraph "Data Protection"
        DataMask[Data Masking]
        AccessLog[Access Logging]
        BackupSec[Secure Backup]
        Recovery[Secure Recovery]
    end

    Auth --> Authz
    Authz --> Validation
    Validation --> Encryption

    Encryption --> InputSan
    InputSan --> RateLimit
    RateLimit --> Audit
    Audit --> Monitoring

    Monitoring --> DataMask
    DataMask --> AccessLog
    AccessLog --> BackupSec
    BackupSec --> Recovery
```

## 使用说明

这些架构图可以通过以下方式查看和使用：

1. **GitHub Pages**: 直接在GitHub仓库中查看，GitHub原生支持Mermaid
2. **本地工具**: 使用VS Code + Mermaid插件或其他Mermaid渲染工具
3. **在线工具**: 使用Mermaid Live Editor等在线工具
4. **文档生成**: 集成到VitePress或其他文档系统中

这些图表为开发团队提供了清晰的视觉化架构指导，有助于理解系统结构和组件关系。