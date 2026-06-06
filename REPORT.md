```
- Name : Tashi Penjor
- Student ID : 02230306
- Course : DBS302 - NoSQL Database Management 
- Date : 07/06/2026
```
---
### Abstract 

This assignment is the showcast of hybrid datalayer of  MongoDB for long term and persistance storage and redis for high spped localized in memory caching and real time computation.

MongoDB acts as the application immutable single source of truth that utilizing flexible schemas to store the complex e-commerce entities for tracking dynamic product category with consistency during checkouts via multi document ACID transactions. Redis on top of that serves as a low latency performance layer that manages shopping cart sessions with Time To Live expiration policies. The endpoints uses the sliding window rate limiters sorted sets (ZSET) for popularity leaderboards and HyperLogLogs for space efficient unique visit tracking. 

---
### System Architecture

![systemarchitecture](./assets/systemarch.png)

---
### Technology Selection Justification

