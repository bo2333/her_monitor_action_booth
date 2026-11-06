import glob, os, sqlite3, time
TOKEN_ACTIONS = ("api_request", "auxiliary_result")

def _files(db_root):
    return glob.glob(os.path.join(db_root, "*.db")) if db_root and os.path.isdir(db_root) else []

def _iter_rows(db_root, sql, params):
    for db in _files(db_root):
        conn = None
        try:
            conn = sqlite3.connect(db, timeout=5)
            conn.row_factory = sqlite3.Row
            for r in conn.execute(sql, params).fetchall(): yield dict(r)
        except Exception: pass
        finally:
            if conn:
                try: conn.close()
                except Exception: pass

def distinct_users(db_root):
    out = set()
    for r in _iter_rows(db_root, "SELECT DISTINCT user FROM events", ()):
        if r.get("user"): out.add(r["user"])
    return sorted(out)

def distinct_actions(db_root):
    out = set()
    for r in _iter_rows(db_root, "SELECT DISTINCT action FROM events", ()):
        if r.get("action"): out.add(r["action"])
    return sorted(out)

def query_history(db_root, *, start=None, end=None, after_ts=0, user=None, limit=1000):
    sql = "SELECT id, ts, user, action, flow, conn, level, cost FROM events WHERE 1=1"
    params = []
    if after_ts and after_ts > 0: sql += " AND ts >= ?"; params.append(after_ts)
    if start is not None: sql += " AND ts >= ?"; params.append(start)
    if end is not None: sql += " AND ts <= ?"; params.append(end)
    if user: sql += " AND user = ?"; params.append(user)
    sql += " ORDER BY ts DESC LIMIT ?"; params.append(limit)
    rows = list(_iter_rows(db_root, sql, params))
    rows.sort(key=lambda x: x["ts"], reverse=True)
    rows = rows[:limit]
    return [{"id": r["id"], "ts": r["ts"], "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r["ts"])),
             "user": r["user"], "action": r["action"], "flow": int(r["flow"] or 0),
             "conn": r["conn"], "level": r["level"], "cost": float(r["cost"] or 0.0)} for r in rows]

def _extract_model(conn):
    if not conn: return ""
    for prefix in ("model=", "aux_task="):
        if prefix in conn: return conn.split(prefix, 1)[1].split("|", 1)[0].strip()
    return ""

def query_token_details(db_root, *, user=None, limit=1000):
    placeholders = ",".join("?" * len(TOKEN_ACTIONS))
    sql = f"SELECT ts, user, action, conn, input_tokens, output_tokens, total_tokens, cost FROM events WHERE action IN ({placeholders})"
    params = list(TOKEN_ACTIONS)
    if user: sql += " AND user = ?"; params.append(user)
    sql += " ORDER BY ts DESC LIMIT ?"; params.append(limit)
    rows = list(_iter_rows(db_root, sql, params))
    rows.sort(key=lambda x: x["ts"], reverse=True)
    rows = rows[:limit]
    return [{"ts": r["ts"], "time": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(r["ts"])),
             "user": r["user"], "action": r["action"], "model": _extract_model(r.get("conn")),
             "in": r["input_tokens"], "out": r["output_tokens"], "total": r["total_tokens"],
             "cost": float(r["cost"] or 0.0)} for r in rows]

def aggregate_trends(db_root, start_ts=None, end_ts=None):
    sql = """
        SELECT user,
            COUNT(CASE WHEN action IN ('api_request','auxiliary_result') THEN 1 END) AS cnt,
            COALESCE(SUM(CASE WHEN action IN ('api_request','auxiliary_result') THEN input_tokens ELSE 0 END), 0) AS in_tok,
            COALESCE(SUM(CASE WHEN action IN ('api_request','auxiliary_result') THEN output_tokens ELSE 0 END), 0) AS out_tok,
            COALESCE(SUM(CASE WHEN action IN ('api_request','auxiliary_result') THEN total_tokens ELSE 0 END), 0) AS tot_tok,
            COALESCE(SUM(cost), 0) AS cost
        FROM events
    """
    conditions = []
    params = []
    if start_ts:
        conditions.append("ts >= ?")
        params.append(start_ts)
    if end_ts:
        conditions.append("ts <= ?")
        params.append(end_ts)
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " GROUP BY user"

    agg = {}
    for r in _iter_rows(db_root, sql, params):
        u = r["user"] or "unknown"
        if u not in agg: agg[u] = [0, 0, 0, 0, 0.0]
        agg[u][0] += int(r["cnt"] or 0)
        agg[u][1] += int(r["in_tok"] or 0)
        agg[u][2] += int(r["out_tok"] or 0)
        agg[u][3] += int(r["tot_tok"] or 0)
        agg[u][4] += float(r["cost"] or 0.0)
    return [{"user": u, "cnt": v[0], "in_tok": v[1], "out_tok": v[2], "tot_tok": v[3], "total_cost": v[4]} for u, v in agg.items()]