import { LitElement, html, css } from "lit";
import { customElement, property, query, state } from "lit/decorators.js"
import Webex, { type ITask } from '@webex/contact-center'

@customElement("wx1-sdk")
export class Wx1Sdk extends LitElement {
    @property({ reflect: true }) accesstoken = ""
    @state() teams = []
    @state() voiceOptions = []
    @state() idleCodes = []
    @state() wrapupCodes = []
    @state() agentLogin = { dialNumber: '', teamId: '', loginOption: 'BROWSER' }
    @state() profile: any
    @state() station: any
    @state() loggedIn: boolean = false
    @state() task: any
    @state() tControls: any
    @state() cad: any
    @query('#selectIdleCode') idleCode: any
    private webex: any;
    static styles = [
        css`
    :host {
        display: block;
        font-family: Arial, sans-serif;
        padding: 16px;
        border: 1px solid #ccc;
        border-radius: 8px;
        max-width: 400px;
        }
    .status {
      color: #0078d4;
      font-weight: bold;
    }
        `
    ];


    startConnection() {
        this.webex = new Webex({
            credentials: {
                access_token: this.accesstoken,
                allowMultiLogin: true
            }
        });
        new Promise((resolve) => {
            this.webex.once('ready', async () => {
                console.log('Webex SDK initialized with OAuth token');

                this.profile = await this.webex.cc.register()
                this.getOptions()
                resolve;
            });
        });

    }

    getOptions() {
        // console.log(JSON.stringify(this.profile))
        this.voiceOptions = this.profile.loginVoiceOptions.map((item: any) => html`<option value=${item}>${item}</option>`)
        this.teams = this.profile.teams.map((item: any) => html`<option value=${item.id}>${item.name}</option>`)
        this.idleCodes = this.profile.idleCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id} @click=${this.changeStatus}>${item.name}</option>`)
        this.wrapupCodes = this.profile.wrapupCodes.filter((item: any) => !item.isSystem).map((item: any) => html`<option value=${item.id}>${item.name}</option>`)

        this.webex.cc.on("AgentStateChangeSuccess", (event: any) => {
            // console.log(event))
            this.idleCode.value = event.auxCodeId
        });
        this.webex.cc.on("task:incoming", (task: ITask) => {

            console.log("incoming", task)
            this.task = task
            this.cad = Object.entries(this.task.data.interaction.callAssociatedDetails).map(([key, value]) => { return html`<p>${key}: ${value}</p>` })
            this.tControls = html`<button @click=${this.actionTask.bind(this, 'hold')}>Hold</button><button @click=${this.actionTask.bind(this, 'resume')}>Resume</button><button @click=${this.actionTask.bind(this, 'end')}>End</button>`
            this.task.once("task:end", (task: ITask) => {
                console.log("end", task)
                // alert(`end ${JSON.stringify(task)}`)
                this.tControls = html`<select>${this.task.wrapupData.wrapUpProps.wrapUpReasonList.map((i: any) => { return html`<option @click=${this.actionTask.bind(this, "wrapup", i.id, i.name)} value=${i.id}>${i.name}</option>` })}</select>`
            })
            this.task.on("task:wrappedup", (task: ITask) => {
                alert("wrapped")
                this.task = null
                this.tControls = null
                this.cad = null
            })


        })

    }

    async actionTask(action: string, aux1: string, aux2: string) {
        switch (action) {
            case "end": {
                this.task.end()
                break
            }
            case "hold": {
                this.task.hold()
                break
            }
            case "resume": {
                this.task.resume()
                break
            }
            case "wrapup": {
                this.task.wrapup({
                    wrapUpReason: `${aux2}`,
                    auxCodeId: `${aux1}`
                })
                break
            }
        }
    }

    async stationLogin() {
        this.webex.cc.on('agent:stationLoginSuccess', (eventData: any) => {
            console.log('Station login successful via event:', eventData);
        })
        this.station = await this.webex.cc.stationLogin(this.agentLogin)
        this.loggedIn = true
    }
    async stationLogout() {
        try {
            await this.webex.cc.stationLogout({ logoutReason: 'End of shift' })
            console.log('Logged out successfully');
            this.loggedIn = false
            await this.webex.cc.deregister()
            this.profile = null
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }
    async changeStation() {

    }
    async changeStatus(e: any) {
        let targetState
        if (e.target.value != "0") { targetState = "Idle" } else { targetState = "Available" }
        try {
            const response = await this.webex.cc.setAgentState({
                state: targetState,          // e.g., "Idle"
                auxCodeId: e.target.value,//targetAuxCodeId,    // e.g., "auxCodeIdForLunch"
                lastStateChangeReason: 'User Initiated'
            });
            console.log('State set successfully:', response);
            // The agent's state is now updated on the backend.
            return response;
        } catch (error) {
            console.error('Failed to set state:', error);
            throw error;
        }

    }
    render() {
        return html`
      <div>

        <h3>Webex Contact Center</h3>
        <!--  Implement choose here -->
        <!-- Login -->
        ${!this.profile ? html`
        <label>Access Token: </label><input @change=${(e: any) => this.accesstoken = e.target.value} id="token" aria-label="Token"><br>
        <button @click=${this.startConnection}>start</button>` : html``}

       <!-- select station options -->
       ${this.profile && !this.loggedIn ? html`<p>Welcome ${this.profile.agentName}</p>
            <label>Handle calls using</label>
            <select @change=${(e: any) => this.agentLogin = { ...this.agentLogin, loginOption: e.target.selectedOptions[0].value }} id="selectVoiceOption">
                <option></option>
                ${this.voiceOptions}
            </select><br>
            <label>Your team</label>
            <select @change=${(e: any) => this.agentLogin.teamId = e.target.selectedOptions[0].value} id="selectTeam">
                <option></option>
                ${this.teams}
            </select><br>
            ${this.agentLogin.loginOption != 'BROWSER' ? html`<label>${this.agentLogin.loginOption}: </label><input @change=${(e: any) => this.agentLogin.dialNumber = e.target.value}><br>` : html``}
            <button @click=${this.stationLogin}>Login</button>
            `: html``}

            <!-- logged in  -->
           ${this.loggedIn ? html`
            <button @click=${this.stationLogout}>Logout</button><button @click=${this.changeStation}>Update Profile</button>
               
            <select id="selectIdleCode">
            ${this.idleCodes}
            </select>
            ${this.cad}<br>
            ${this.tControls}
         ` : html``} 


        </div>
            `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "wx1-sdk": Wx1Sdk;
    }
}
