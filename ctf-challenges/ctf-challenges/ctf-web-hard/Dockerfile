FROM php:8.2-apache

# نسخ كل الملفات (index, stage1, stage2, stage3)
COPY . /var/www/html/

# التأكد من الملكية والصلاحيات
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80