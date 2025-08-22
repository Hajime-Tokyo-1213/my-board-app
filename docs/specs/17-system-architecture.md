# システムアーキテクチャ図

## 全体アーキテクチャ

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Browser]
        PWA[PWA App]
        MOBILE[Mobile Browser]
    end
    
    subgraph "CDN Layer"
        CF[Cloudflare CDN]
        STATIC[Static Assets]
        IMAGES[Cloudinary Images]
    end
    
    subgraph "Application Layer"
        subgraph "Frontend"
            NEXT[Next.js App<br/>React 18]
            SW[Service Worker]
        end
        
        subgraph "API Gateway"
            NGINX[Nginx<br/>Load Balancer]
            RATE[Rate Limiter]
        end
        
        subgraph "Backend Services"
            API[API Server<br/>Node.js/Express]
            AUTH[Auth Service<br/>NextAuth.js]
            WS[WebSocket Server<br/>Socket.io]
            WORKER[Background Workers<br/>Bull Queue]
        end
    end
    
    subgraph "Data Layer"
        subgraph "Primary Storage"
            PG[(PostgreSQL<br/>Primary DB)]
            REDIS[(Redis<br/>Cache & Session)]
        end
        
        subgraph "Secondary Storage"
            ES[(Elasticsearch<br/>Search Index)]
            S3[S3 Compatible<br/>Object Storage]
        end
    end
    
    subgraph "External Services"
        MAIL[SendGrid<br/>Email]
        PUSH[FCM<br/>Push Notifications]
        ANALYTICS[Google Analytics]
        SENTRY[Sentry<br/>Error Tracking]
    end
    
    WEB --> CF
    PWA --> CF
    MOBILE --> CF
    
    CF --> NEXT
    CF --> STATIC
    
    NEXT --> NGINX
    NGINX --> API
    NGINX --> AUTH
    NGINX --> WS
    
    API --> PG
    API --> REDIS
    API --> ES
    API --> WORKER
    
    WORKER --> PG
    WORKER --> REDIS
    WORKER --> MAIL
    
    WS --> REDIS
    AUTH --> PG
    
    IMAGES --> S3
    API --> IMAGES
```

## マイクロサービスアーキテクチャ

```mermaid
graph LR
    subgraph "API Gateway"
        GW[Kong/Express Gateway]
    end
    
    subgraph "Core Services"
        USER[User Service]
        POST[Post Service]
        AUTH[Auth Service]
        NOTIF[Notification Service]
    end
    
    subgraph "Support Services"
        SEARCH[Search Service]
        MEDIA[Media Service]
        TIMELINE[Timeline Service]
        ANALYTICS[Analytics Service]
    end
    
    subgraph "Infrastructure"
        MQ[Message Queue<br/>RabbitMQ/Redis]
        CACHE[Distributed Cache<br/>Redis Cluster]
        DB[(Database<br/>PostgreSQL)]
    end
    
    GW --> USER
    GW --> POST
    GW --> AUTH
    GW --> NOTIF
    
    USER --> MQ
    POST --> MQ
    NOTIF --> MQ
    
    MQ --> SEARCH
    MQ --> TIMELINE
    MQ --> ANALYTICS
    
    USER --> CACHE
    POST --> CACHE
    TIMELINE --> CACHE
    
    USER --> DB
    POST --> DB
    AUTH --> DB
```

## デプロイメントアーキテクチャ

```mermaid
graph TB
    subgraph "Development"
        DEV_LOCAL[Local Docker]
        DEV_DB[(SQLite/PostgreSQL)]
    end
    
    subgraph "Staging"
        subgraph "Vercel"
            STAGE_NEXT[Next.js App]
            STAGE_API[API Routes]
        end
        subgraph "Supabase"
            STAGE_DB[(PostgreSQL)]
            STAGE_AUTH[Auth]
            STAGE_STORAGE[Storage]
        end
    end
    
    subgraph "Production"
        subgraph "AWS/GCP"
            subgraph "Kubernetes Cluster"
                PROD_PODS[App Pods<br/>Auto-scaling]
                PROD_SERVICES[Services]
                PROD_INGRESS[Ingress Controller]
            end
            
            PROD_RDS[(RDS PostgreSQL<br/>Multi-AZ)]
            PROD_ELASTICACHE[(ElastiCache<br/>Redis Cluster)]
            PROD_S3[S3 Buckets]
            PROD_CF[CloudFront CDN]
        end
    end
    
    DEV_LOCAL --> |CI/CD| STAGE_NEXT
    STAGE_NEXT --> |Promote| PROD_PODS
```

## データフローアーキテクチャ

```mermaid
graph LR
    subgraph "Write Path"
        CLIENT_W[Client] --> API_W[API Server]
        API_W --> VALIDATE[Validation]
        VALIDATE --> BUSINESS[Business Logic]
        BUSINESS --> DB_W[(Primary DB)]
        DB_W --> REPLICA[(Read Replicas)]
        BUSINESS --> CACHE_W[Cache Invalidation]
        BUSINESS --> QUEUE[Message Queue]
        QUEUE --> WORKERS[Workers]
    end
    
    subgraph "Read Path"
        CLIENT_R[Client] --> CDN[CDN Cache]
        CDN --> API_R[API Server]
        API_R --> CACHE_R[Redis Cache]
        CACHE_R --> |Miss| DB_R[(Read Replica)]
        DB_R --> CACHE_R
        CACHE_R --> API_R
        API_R --> CLIENT_R
    end
```

## セキュリティアーキテクチャ

```mermaid
graph TB
    subgraph "Edge Security"
        WAF[Web Application Firewall]
        DDOS[DDoS Protection]
        GEOBLOCK[Geo-blocking]
    end
    
    subgraph "Application Security"
        subgraph "Authentication"
            JWT[JWT Tokens]
            OAUTH[OAuth 2.0]
            MFA[2FA/MFA]
        end
        
        subgraph "Authorization"
            RBAC[Role-Based Access]
            POLICIES[Policy Engine]
            PERMISSIONS[Permissions]
        end
        
        subgraph "Data Protection"
            ENCRYPT[Encryption at Rest]
            TLS[TLS 1.3]
            HASH[Password Hashing]
        end
    end
    
    subgraph "Infrastructure Security"
        SECRETS[Secrets Manager]
        VAULT[HashiCorp Vault]
        IAM[IAM Policies]
        NETWORK[Network Policies]
    end
    
    WAF --> JWT
    JWT --> RBAC
    RBAC --> ENCRYPT
    ENCRYPT --> SECRETS
```

## スケーリング戦略

```mermaid
graph TB
    subgraph "Horizontal Scaling"
        LB[Load Balancer]
        APP1[App Instance 1]
        APP2[App Instance 2]
        APP3[App Instance 3]
        APPN[App Instance N]
        
        LB --> APP1
        LB --> APP2
        LB --> APP3
        LB --> APPN
    end
    
    subgraph "Vertical Scaling"
        SMALL[t3.small<br/>2 vCPU, 2GB]
        MEDIUM[t3.medium<br/>2 vCPU, 4GB]
        LARGE[t3.large<br/>2 vCPU, 8GB]
        XLARGE[t3.xlarge<br/>4 vCPU, 16GB]
        
        SMALL --> |Scale Up| MEDIUM
        MEDIUM --> |Scale Up| LARGE
        LARGE --> |Scale Up| XLARGE
    end
    
    subgraph "Database Scaling"
        MASTER[(Master)]
        SLAVE1[(Slave 1)]
        SLAVE2[(Slave 2)]
        SHARD1[(Shard 1)]
        SHARD2[(Shard 2)]
        
        MASTER --> SLAVE1
        MASTER --> SLAVE2
        MASTER -.-> SHARD1
        MASTER -.-> SHARD2
    end
```

## 監視・ロギングアーキテクチャ

```mermaid
graph TB
    subgraph "Applications"
        APP[Application]
        API[API Server]
        DB[(Database)]
    end
    
    subgraph "Metrics Collection"
        PROM[Prometheus]
        STATSD[StatsD]
        CUSTOM[Custom Metrics]
    end
    
    subgraph "Logging"
        FLUENTD[Fluentd]
        LOGSTASH[Logstash]
        CLOUDWATCH[CloudWatch]
    end
    
    subgraph "Storage"
        ELASTIC[(Elasticsearch)]
        INFLUX[(InfluxDB)]
        S3[S3 Logs]
    end
    
    subgraph "Visualization"
        GRAFANA[Grafana]
        KIBANA[Kibana]
        CUSTOM_DASH[Custom Dashboard]
    end
    
    subgraph "Alerting"
        ALERT[AlertManager]
        PAGER[PagerDuty]
        SLACK[Slack]
    end
    
    APP --> PROM
    APP --> FLUENTD
    API --> STATSD
    DB --> CLOUDWATCH
    
    PROM --> INFLUX
    FLUENTD --> ELASTIC
    STATSD --> INFLUX
    
    INFLUX --> GRAFANA
    ELASTIC --> KIBANA
    
    GRAFANA --> ALERT
    ALERT --> PAGER
    ALERT --> SLACK
```

## 災害復旧アーキテクチャ

```mermaid
graph TB
    subgraph "Primary Region"
        PRIMARY_APP[Application]
        PRIMARY_DB[(Primary DB)]
        PRIMARY_CACHE[(Cache)]
        PRIMARY_STORAGE[Storage]
    end
    
    subgraph "Backup Strategy"
        CONTINUOUS[Continuous Backup]
        SNAPSHOT[Daily Snapshots]
        ARCHIVE[Long-term Archive]
    end
    
    subgraph "Secondary Region"
        STANDBY_APP[Standby App]
        STANDBY_DB[(Standby DB)]
        STANDBY_CACHE[(Cache)]
        STANDBY_STORAGE[Storage]
    end
    
    PRIMARY_DB --> |Streaming Replication| STANDBY_DB
    PRIMARY_STORAGE --> |Cross-Region Sync| STANDBY_STORAGE
    PRIMARY_DB --> CONTINUOUS
    CONTINUOUS --> SNAPSHOT
    SNAPSHOT --> ARCHIVE
    
    PRIMARY_APP --> |Failover| STANDBY_APP
```

## CI/CD パイプライン

```mermaid
graph LR
    subgraph "Development"
        CODE[Source Code]
        GIT[Git Push]
    end
    
    subgraph "CI Pipeline"
        TRIGGER[GitHub Actions]
        LINT[Linting]
        TEST[Unit Tests]
        E2E[E2E Tests]
        BUILD[Build]
        SCAN[Security Scan]
    end
    
    subgraph "CD Pipeline"
        ARTIFACT[Build Artifacts]
        STAGING[Deploy Staging]
        SMOKE[Smoke Tests]
        APPROVAL[Manual Approval]
        PROD[Deploy Production]
        ROLLBACK[Rollback]
    end
    
    CODE --> GIT
    GIT --> TRIGGER
    TRIGGER --> LINT
    LINT --> TEST
    TEST --> E2E
    E2E --> BUILD
    BUILD --> SCAN
    SCAN --> ARTIFACT
    ARTIFACT --> STAGING
    STAGING --> SMOKE
    SMOKE --> APPROVAL
    APPROVAL --> PROD
    PROD -.-> ROLLBACK
```

## コンテナオーケストレーション

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Master Nodes"
            APISERVER[API Server]
            SCHEDULER[Scheduler]
            CONTROLLER[Controller Manager]
            ETCD[(etcd)]
        end
        
        subgraph "Worker Nodes"
            subgraph "Node 1"
                POD1[Pod: App]
                POD2[Pod: API]
                KUBELET1[Kubelet]
                PROXY1[Kube-proxy]
            end
            
            subgraph "Node 2"
                POD3[Pod: Worker]
                POD4[Pod: Cache]
                KUBELET2[Kubelet]
                PROXY2[Kube-proxy]
            end
        end
        
        subgraph "Services"
            SVC_APP[App Service]
            SVC_API[API Service]
            INGRESS[Ingress]
        end
    end
    
    APISERVER --> SCHEDULER
    SCHEDULER --> CONTROLLER
    CONTROLLER --> ETCD
    
    APISERVER --> KUBELET1
    APISERVER --> KUBELET2
    
    POD1 --> SVC_APP
    POD2 --> SVC_API
    
    INGRESS --> SVC_APP
    INGRESS --> SVC_API
```

## キャッシング戦略

```mermaid
graph TB
    subgraph "Multi-Layer Caching"
        subgraph "L1: Browser Cache"
            BROWSER[Browser Storage<br/>Service Worker]
        end
        
        subgraph "L2: CDN Cache"
            CDN[CDN Edge Locations<br/>Static Assets]
        end
        
        subgraph "L3: Application Cache"
            MEMORY[In-Memory Cache<br/>Node.js]
        end
        
        subgraph "L4: Distributed Cache"
            REDIS[Redis Cluster<br/>Session & Data]
        end
        
        subgraph "L5: Database Cache"
            QUERY[Query Cache<br/>PostgreSQL]
        end
    end
    
    BROWSER --> |Miss| CDN
    CDN --> |Miss| MEMORY
    MEMORY --> |Miss| REDIS
    REDIS --> |Miss| QUERY
```