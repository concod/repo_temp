import { STATES , TRANSITION, WORKFLOW, TRANSITIONAPPROVAL} from '../../config/api';
import axiosInstance from '../Utils/axios';
import { LOADER, GET_STATES ,GET_TRANSITIONS ,GET_WORKFLOWS, GET_TRANSITION_APPROVALS} from './types';


export const getStates = () => async (dispatch) => {
    dispatch({
        type: LOADER,
        payload: {
          status: true,
        },
      });
    const {data} = await  axiosInstance({
        url: STATES,
        method: 'GET',
      })
      dispatch({
        type: GET_STATES,
        payload: data.data.results
    })
    dispatch({
        type: LOADER,
        payload: {
          status: false,
        },
      });

}

export const getTranstions= () => async (dispatch) => {
  dispatch({
      type: LOADER,
      payload: {
        status: true,
      },
    });
  const {data} = await  axiosInstance({
      url: TRANSITION,
      method: 'GET',
    })
    dispatch({
      type: GET_TRANSITIONS,
      payload: data.data.results
  })
  dispatch({
      type: LOADER,
      payload: {
        status: false,
      },
    });

}

export const getWorkflows= () => async (dispatch) => {
  dispatch({
      type: LOADER,
      payload: {
        status: true,
      },
    });
  const {data} = await  axiosInstance({
      url: WORKFLOW,
      method: 'GET',
    })
    dispatch({
      type: GET_WORKFLOWS,
      payload: data.data.results
  })
  dispatch({
      type: LOADER,
      payload: {
        status: false,
      },
    });

}

export const getTranstionApprovals = () => async (dispatch) => {
  dispatch({
    type: LOADER,
    payload: {
      status: true,
    },
  });
  const {data} = await  axiosInstance({
    url: TRANSITIONAPPROVAL,
    method: 'GET',
  })
  dispatch({
    type: GET_TRANSITION_APPROVALS,
    payload: data.data.results
})
dispatch({
    type: LOADER,
    payload: {
      status: false,
    },
  });
}