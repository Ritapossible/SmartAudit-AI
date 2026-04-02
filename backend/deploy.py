"""
GenLayer Deployment Script
Deploys the SmartAudit intelligent contract to GenLayer testnet.

Usage:
    python deploy.py

Environment Variables:
    PRIVATE_KEY     - Your GenLayer wallet private key
    GENLAYER_RPC    - GenLayer RPC endpoint (defaults to studio API)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

PRIVATE_KEY = os.getenv("PRIVATE_KEY")
GENLAYER_RPC = os.getenv("GENLAYER_RPC", "https://studio.genlayer.com/api")


def deploy():
    if not PRIVATE_KEY:
        print("❌ Error: PRIVATE_KEY environment variable is required")
        print("   Set it in .env file or export PRIVATE_KEY=your_key")
        sys.exit(1)

    contract_path = Path(__file__).parent.parent / "contracts" / "smart_audit.py"
    if not contract_path.exists():
        print(f"❌ Error: Contract not found at {contract_path}")
        sys.exit(1)

    print("🚀 Deploying SmartAudit AI to GenLayer testnet...")
    print(f"   RPC: {GENLAYER_RPC}")
    print(f"   Contract: {contract_path}")

    try:
        from genlayer import Client

        client = Client(
            rpc_url=GENLAYER_RPC,
            private_key=PRIVATE_KEY,
        )

        with open(contract_path, "r") as f:
            contract_code = f.read()

        result = client.deploy_contract(
            code=contract_code,
            constructor_args=[],
        )

        contract_address = result.get("address", result)
        print(f"\n✅ Contract deployed successfully!")
        print(f"   Address: {contract_address}")
        print(f"\n📋 Next steps:")
        print(f"   1. Add to .env:  CONTRACT_ADDRESS={contract_address}")
        print(f"   2. Add to frontend: VITE_GENLAYER_CONTRACT_ADDRESS={contract_address}")
        print(f"   3. Restart the backend: python main.py")

        return contract_address

    except ImportError:
        print("❌ Error: genlayer package not installed")
        print("   Run: pip install genlayer")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Deployment failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    deploy()
