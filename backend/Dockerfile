FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 FLASK_APP=run.py PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN addgroup --system app && adduser --system --ingroup app app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=app:app . .
USER app
EXPOSE 5000
CMD ["sh", "-c", "flask init-db && gunicorn --workers 2 --threads 4 --timeout 60 --access-logfile - --error-logfile - --bind 0.0.0.0:${PORT:-5000} run:app"]
