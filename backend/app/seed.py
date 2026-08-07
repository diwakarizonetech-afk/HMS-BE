# Master Seed module for HMS Application.
# Seeds and synchronizes Core Accounts, Roles, Permissions, Hospital Profile & Departments.

from app.seed.super_admin import seed_super_admin


def seed():
    seed_super_admin()


if __name__ == "__main__":
    seed()
