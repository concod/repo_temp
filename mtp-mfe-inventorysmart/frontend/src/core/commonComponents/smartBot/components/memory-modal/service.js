import axiosInstance from "core/Utils/axios";

export const fetchAllMemories = async (baseUrl) => {
  try {
    let data = await axiosInstance({
      url: `${baseUrl}/chatbot/agent/memory/get_all`,
      method: "GET",
    });
    return data?.data?.data;
  } catch (error) {
    console.error("fetchUserMemory error", error);
    return null;
  }
};

export const editMemory = async (baseUrl, memoryId, data) => {
  try {
    let response = await axiosInstance({
      url: `${baseUrl}/chatbot/agent/memory/update/${memoryId}`,
      method: "PUT",
      data,
    });
    return response;
  } catch (error) {
    console.error("editMemory error", error);
    return null;
  }
};

export const deleteMemory = async (baseUrl, memoryId) => {
  try {
    let response = await axiosInstance({
      url: `${baseUrl}/chatbot/agent/memory/delete/${memoryId}`,
      method: "DELETE",
    });
    return response;
  } catch (error) {
    console.error("deleteMemory error", error);
    return null;
  }
};