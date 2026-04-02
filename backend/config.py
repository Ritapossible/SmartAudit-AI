"""
Configuration for SmartAudit AI Backend
"""

import os
from dotenv import load_dotenv

load_dotenv()

# GenLayer Configuration
GENLAYER_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "0x4a3Be244f4db018391F2e6BA4EFeBf7d13d70cd4")

# Server Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
