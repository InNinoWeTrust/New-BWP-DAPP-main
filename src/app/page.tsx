"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ConnectButton } from "thirdweb/react";
import { useAddress, useContract, useContractRead } from "@thirdweb-dev/react";

import { ethers } from "ethers";
import thirdwebIcon from "@public/brownwatersproductions Complete.png";

const editionDropAddress = '0xD81324D8a826F85eB73A2810bf54eBD80802604f';
const tokenAddress = '0x429b958f74810902d90Ad85c5Ff200fefFCFDB08';
const voteAddress = '0x19733aC20CEd46593E29Ac27230069A2F8df6A3b';

export default function Home() {
  // Get the connected wallet address
  const address = useAddress();
  
  // Fetch contracts
  const { contract: editionDrop } = useContract(editionDropAddress, "edition-drop");
  const { contract: token } = useContract(tokenAddress, "token");
  const { contract: vote } = useContract(voteAddress, "vote");

  // Fetch the user's NFT balance
  const { data: nftBalance } = useContractRead(editionDrop, "balanceOf", [address, 0]);

  const hasClaimedNFT = useMemo(() => {
    return nftBalance && ethers.BigNumber.from(nftBalance).gt(0);
  }, [nftBalance]);

  // State to manage members and proposals
  const [memberTokenAmounts, setMemberTokenAmounts] = useState([]);
  const [memberAddresses, setMemberAddresses] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (!hasClaimedNFT) return;

    const getAllProposals = async () => {
      try {
        const proposals = await vote.getAll();
        setProposals(proposals);
      } catch (error) {
        console.error("Failed to get proposals", error);
      }
    };
    getAllProposals();
  }, [hasClaimedNFT, vote]);

  useEffect(() => {
    if (!hasClaimedNFT) return;

    const checkIfUserHasVoted = async () => {
      try {
        const hasVoted = await vote.hasVoted(proposals[0]?.id, address);
        setHasVoted(hasVoted);
      } catch (error) {
        console.error("Failed to check if user has voted", error);
      }
    };
    checkIfUserHasVoted();
  }, [hasClaimedNFT, proposals, address, vote]);

  useEffect(() => {
    if (!hasClaimedNFT) return;

    const getAllAddresses = async () => {
      try {
        const addresses = await editionDrop.erc1155.history.getAllClaimerAddresses(0);
        setMemberAddresses(addresses);
      } catch (error) {
        console.error("Failed to get member addresses", error);
      }
    };
    getAllAddresses();
  }, [hasClaimedNFT, editionDrop]);

  useEffect(() => {
    if (!hasClaimedNFT) return;

    const getAllBalances = async () => {
      try {
        const amounts = await token.erc20.history.getAllHolderBalances();
        setMemberTokenAmounts(amounts);
      } catch (error) {
        console.error("Failed to get member balances", error);
      }
    };
    getAllBalances();
  }, [hasClaimedNFT, token]);

  const memberList = useMemo(() => {
    return memberAddresses.map((addr) => {
      const member = memberTokenAmounts.find(({ holder }) => holder === addr);
      return {
        address: addr,
        tokenAmount: member?.balance.displayValue || '0',
      };
    });
  }, [memberAddresses, memberTokenAmounts]);

  return (
    <main className="p-4 pb-10 min-h-[100vh] flex items-center justify-center container max-w-screen-lg mx-auto">
      <div className="py-20">
        <Header />

        <div className="flex justify-center mb-20">
          <ConnectButton
            client={client}
            appMetadata={{
              name: "Brown Waters DAO",
              url: "https://brownwatersdao.com",
            }}
          />
        </div>

        {address ? (
          hasClaimedNFT ? (
            <MemberPage 
              memberList={memberList}
              proposals={proposals}
              isVoting={isVoting}
              setIsVoting={setIsVoting}
              hasVoted={hasVoted}
              vote={vote}
              token={token}
              address={address}
            />
          ) : (
            <MintNFT />
          )
        ) : (
          <p>Please connect your wallet to continue.</p>
        )}
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="flex flex-col items-center mb-20">
      <Image src={thirdwebIcon} alt="Thirdweb Icon" className="size-[150px]" />
      <h1 className="text-2xl md:text-6xl font-semibold md:font-bold tracking-tighter mb-6 text-zinc-100">
        Brown Waters DAO
      </h1>
    </header>
  );
}

function MintNFT() {
  return (
    <div className="mint-nft">
      <h1>Mint your Brown Waters DAO Membership NFT</h1>
      <Web3Button
        contractAddress={editionDropAddress}
        action={(contract) => contract.erc1155.claim(0, 1)}
        onSuccess={() => {
          console.log(`🌊 Successfully Minted!`);
        }}
        onError={(error) => {
          console.error("Failed to mint NFT", error);
        }}
      >
        Mint NFT
      </Web3Button>
    </div>
  );
}

function MemberPage({ memberList, proposals, isVoting, setIsVoting, hasVoted, vote, token, address }) {
  return (
    <div className="member-page">
      <h1>🫗 Brown Waters DAO Member's Page</h1>
      <div>
        <h2>Member List</h2>
        <table className="card">
          <thead>
            <tr>
              <th>Address</th>
              <th>Token Amount</th>
            </tr>
          </thead>
          <tbody>
            {memberList.map((member) => (
              <tr key={member.address}>
                <td>{member.address}</td>
                <td>{member.tokenAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2>Active Proposals</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setIsVoting(true);
            try {
              const votes = proposals.map((proposal) => {
                const voteResult = { proposalId: proposal.id, vote: 2 }; // Abstain by default
                proposal.votes.forEach(({ type }) => {
                  const elem = document.getElementById(`${proposal.id}-${type}`);
                  if (elem.checked) {
                    voteResult.vote = type;
                  }
                });
                return voteResult;
              });

              const delegation = await token.getDelegationOf(address);
              if (delegation === ethers.constants.AddressZero) {
                await token.delegateTo(address);
              }

              await Promise.all(
                votes.map(async ({ proposalId, vote: _vote }) => {
                  const proposal = await vote.get(proposalId);
                  if (proposal.state === 1) {
                    await vote.vote(proposalId, _vote);
                  }
                })
              );

              setIsVoting(false);
            } catch (err) {
              console.error("Failed to vote", err);
            }
          }}
        >
          {proposals.map((proposal) => (
            <div key={proposal.id} className="card">
              <h5>{proposal.description}</h5>
              <div>
                {proposal.votes.map(({ type, label }) => (
                  <div key={type}>
                    <input
                      type="radio"
                      id={`${proposal.id}-${type}`}
                      name={proposal.id}
                      value={type}
                      defaultChecked={type === 2}
                    />
                    <label htmlFor={`${proposal.id}-${type}`}>{label}</label>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button disabled={isVoting || hasVoted} type="submit">
            {isVoting ? "Voting..." : hasVoted ? "You Already Voted" : "Submit Votes"}
          </button>
        </form>
      </div>
    </div>
  );
}
