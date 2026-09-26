import { fetchBaseUrl } from "core/Utils/functions/utils";
import { Modal, Tabs } from "impact-ui-v3";
import { useEffect, useState } from "react";
import { fetchAllMemories, deleteMemory, editMemory } from "./service.js";
import Memories from "./components/Memories.jsx";

const MemoryModal = (props) => {
  const { isModalOpen, setIsModalOpen, displaySnackMessages } = props;
  const [tabValue, setTabValue] = useState("user_preference");
  const [baseUrl, setBaseUrl] = useState("");
  const [allMemories, setAllMemories] = useState(null);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleChangeTabValue = (event, newValue) => {
    setTabValue(newValue);
  };

  const getBaseUrl = async () => {
    try {
      let basUrl = await fetchBaseUrl();
      setBaseUrl(basUrl);
      return basUrl;
    } catch (err) {
      console.error("Error loading base url:", err);
    }
  };

  const getMemories = async () => {
    setIsMemoriesLoading(true);
    let memories = await fetchAllMemories(baseUrl);
    setAllMemories(memories || []);
    setIsMemoriesLoading(false);
  };

  const handleDelete = async (memoryId) => {
    try {
      setIsUpdating(true);
      let response = await deleteMemory(baseUrl, memoryId);
      if (response.status === 200) {
        displaySnackMessages("Memory deleted successfully", "success");
        setAllMemories((prev) => prev.filter((m) => m.memory_id !== memoryId));
      }
      else {
        displaySnackMessages("Memory deletion failed", "error");
      }
    } catch (e) {
      // noop; service already logs
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = async (memory, newText) => {
    const { memory_id, new_memory: old_memory } = memory;
    if (newText == null || newText.trim() === "") return;
    try {
      setIsUpdating(true);
      let response = await editMemory(baseUrl, memory_id, {
        new_memory: newText.trim(),
        old_memory: old_memory,
      });
      if (response.status === 200) {
        displaySnackMessages("Memory updated successfully", "success");
        setAllMemories((prev) =>
          prev.map((m) =>
            m.memory_id === memory_id ? { ...m, new_memory: newText.trim() } : m
          )
        );
      }
      else {
        displaySnackMessages("Memory updation failed", "error");
      }
    } catch (e) {
      // noop; service already logs
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    getBaseUrl();
  }, []);

  useEffect(() => {
    if (baseUrl) {
        getMemories();
    }
  }, [baseUrl]);

  return (
    <Modal
      onClose={handleModalClose}
      onPrimaryButtonClick={() => {}}
      onSecondaryButtonClick={handleModalClose}
      open={isModalOpen}
      size="large"
      title="Saved memories"
    >
      <Tabs
        onChange={handleChangeTabValue}
        orientation="horizontal"
        tabNames={[
          {
            label: "User Memory",
            value: "user_preference",
            // icon: <StepsIcon />,
          },
          {
            label: "Company Policy",
            value: "company_policy",
            // icon: <AgentResponseIcon />,
          },
        ]}
        tabPanels={[
          <Memories
            loading={isMemoriesLoading}
            updating={isUpdating}
            memories={allMemories || []}
            onDelete={handleDelete}
            onEdit={handleEdit}
            tabFilter="user_preference"
          />,
          <Memories
            loading={isMemoriesLoading}
            updating={isUpdating}
            memories={allMemories || []}
            onDelete={handleDelete}
            onEdit={handleEdit}
            tabFilter="company_policy"
          />,
        ]}
        value={tabValue}
      />
    </Modal>
  );
};

export default MemoryModal;
