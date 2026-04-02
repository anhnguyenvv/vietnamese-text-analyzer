import multiprocessing

bind = "0.0.0.0:5000"
workers = max(2, multiprocessing.cpu_count() * 2 + 1)
worker_class = "sync"
timeout = 120
graceful_timeout = 30
preload_app = True
chdir = "/app/src"
accesslog = "-"
errorlog = "-"