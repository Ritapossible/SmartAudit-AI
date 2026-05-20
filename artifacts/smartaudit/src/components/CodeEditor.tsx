interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
}

const SAMPLE_CONTRACTS = [
  {
    label: "Vulnerable Vault",
    code: `pragma solidity ^0.8.0;
// Sample Contract — Reentrancy Vulnerable

contract Example {
    mapping(address => uint256) balances;

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount);
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;
    }

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
}`,
  },
  {
    label: "ERC-20 Token",
    code: `pragma solidity ^0.8.0;

contract SimpleToken {
    string public name = "SimpleToken";
    string public symbol = "STK";
    uint8 public decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(uint256 _initialSupply) {
        totalSupply = _initialSupply * 10 ** decimals;
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Not approved");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`,
  },
  {
    label: "Staking Contract",
    code: `pragma solidity ^0.8.0;

contract SimpleStaking {
    address public owner;
    uint256 public rewardRate = 100;
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakedTimestamp;

    constructor() {
        owner = msg.sender;
    }

    function stake() external payable {
        require(msg.value > 0, "Must stake something");
        if (stakedBalance[msg.sender] > 0) {
            _claimReward();
        }
        stakedBalance[msg.sender] += msg.value;
        stakedTimestamp[msg.sender] = block.timestamp;
    }

    function unstake(uint256 amount) external {
        require(stakedBalance[msg.sender] >= amount, "Not enough staked");
        _claimReward();
        stakedBalance[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok);
    }

    function _claimReward() internal {
        uint256 duration = block.timestamp - stakedTimestamp[msg.sender];
        uint256 reward = (stakedBalance[msg.sender] * duration * rewardRate) / 1e18;
        stakedTimestamp[msg.sender] = block.timestamp;
        if (reward > 0) {
            (bool ok, ) = msg.sender.call{value: reward}("");
            require(ok);
        }
    }

    function setRewardRate(uint256 _rate) external {
        rewardRate = _rate;
    }
}`,
  },
];

const SAMPLE_CONTRACT = SAMPLE_CONTRACTS[0].code;

const CodeEditor = ({ code, onChange }: CodeEditorProps) => {
  const lines = code.split("\n");

  return (
    <div className="code-bg rounded-lg overflow-hidden border border-border/20">
      <div className="flex">
        <div className="py-4 px-3 select-none">
          {lines.map((_, i) => (
            <div key={i} className="text-code-line text-xs leading-6 text-right font-mono">
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent text-code text-sm leading-6 py-4 pr-4 resize-none outline-none min-h-[200px] font-mono"
          spellCheck={false}
          placeholder="Paste your smart contract code here..."
        />
      </div>
    </div>
  );
};

export { SAMPLE_CONTRACT, SAMPLE_CONTRACTS };
export default CodeEditor;
