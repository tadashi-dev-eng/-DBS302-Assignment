
KEYS "product:cache:*"

HGETALL "cart:[your_user_id]"

ZREVRANGE analytics:trending_products 0 -1 WITHSCORES