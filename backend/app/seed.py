# Master Seed module for HMS Application.
# Seeds and synchronizes Core Accounts, Roles, Hospital Profile, Branches, Staff & Medicines.
# NOTE: Patient records and visits are strictly excluded from seed data.

from seed_db import seed_database


def seed():
    seed_database()


if __name__ == "__main__":
    seed()

