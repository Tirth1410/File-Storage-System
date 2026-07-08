# Use the official PostgreSQL image as the base image
FROM postgres:18

# Set the default database user
ENV POSTGRES_USER=root

# Set the password for the above user
ENV POSTGRES_PASSWORD=root

# Create a database automatically on first startup
ENV POSTGRES_DB=filestoragedb

# PostgreSQL listens on port 5432
EXPOSE 5432